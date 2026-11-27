import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { StructureValidationResult } from '../../constants/structure-validation-result';
import { StructureApiService } from '../structure-api.service';
import { StructureValidationService } from '../structure-validation.service';

describe('Structure link rule', () => {
    let service: StructureValidationService;
    let structureExists: ReturnType<typeof vi.fn>;
    const repository = { owner: 'owner', repository: 'repository', branch: 'main', key: 'models/Customer.md' };

    beforeEach(() => {
        structureExists = vi.fn().mockReturnValue(of(true));
        TestBed.configureTestingModule({
            providers: [{ provide: StructureApiService, useValue: { isStructureExists: structureExists } }]
        });
        service = TestBed.inject(StructureValidationService);
    });

    async function validate(markdown: string) {
        return (await service.validate(`# model Customer\n## description\n${markdown}`, repository))
            .filter(validation => validation.ruleId === 'markdown-links');
    }

    it.each([
        'https://example.com/path?query=value#section',
        'https://github.com/other/repository/blob/main/file.md',
        'mailto:person@example.com',
        'tel:+380123456789',
        'ftp://example.com/file',
        '//example.com/file'
    ])('accepts valid external URLs without a repository request: %s', async href => {
        expect(await validate(`[Link](${href})`)).toEqual([]);
        expect(structureExists).not.toHaveBeenCalled();
    });

    it.each(['http://example.com', 'HTTP://example.com/path'])('reports insecure HTTP URLs: %s', async href => {
        expect(await validate(`[Link](${href})`)).toEqual([{
            ruleId: 'markdown-links', result: StructureValidationResult.Error, row: 3, url: href,
            message: 'Link starts from HTTP', suggestion: 'Change to https://'
        }]);
        expect(structureExists).not.toHaveBeenCalled();
    });

    it.each([
        'https://', 'https:/example.com', 'https:example.com', 'https//example.com',
        'htps://example.com', 'https://bad host', 'https://example.com/%ZZ', 'https://example.com/%FF',
        'https://example.com:invalid', 'javascript:alert(1)'
    ])('reports invalid external URL formats: %s', async href => {
        expect(await validate(`[Link](<${href}>)`)).toEqual([{
            ruleId: 'markdown-links', result: StructureValidationResult.Error, row: 3, url: href,
            message: 'Wrong link format', suggestion: 'Check and fix url'
        }]);
        expect(structureExists).not.toHaveBeenCalled();
    });

    it('can report both HTTP and URL format problems', async () => {
        expect((await validate('[Link](http://)')).map(validation => validation.message))
            .toEqual(['Link starts from HTTP', 'Wrong link format']);
    });

    it.each([
        ['/models/Other.md', 'models/Other.md'],
        ['/models/Other.md?view=source#properties', 'models/Other.md'],
        ['/models/Other%20Name.md', 'models/Other Name.md'],
        ['/models/%2520.md', 'models/%20.md'],
        ['/models/', 'models'],
        ['/', '']
    ])('checks root-relative files and folders on the selected branch: %s', async (href, path) => {
        expect(await validate(`[Link](${href})`)).toEqual([]);
        expect(structureExists).toHaveBeenCalledWith('owner', 'repository', 'main', path);
    });

    it.each([
        ['Other.md', 'models/Other.md'],
        ['./Other.md', 'models/Other.md'],
        ['../Other.md', 'Other.md']
    ])('warns about relative links while checking their actual destination: %s', async (href, path) => {
        expect(await validate(`[Link](${href})`)).toEqual([{
            ruleId: 'markdown-links', result: StructureValidationResult.Warning, row: 3, url: href,
            message: "Link doesn't start from root", suggestion: 'Start link from root path folder'
        }]);
        expect(structureExists).toHaveBeenCalledWith('owner', 'repository', 'main', path);
    });

    it('reports a missing file and retains the non-root warning', async () => {
        structureExists.mockReturnValue(of(false));
        const validations = await validate('[Missing](Other.md)');
        expect(validations.map(validation => validation.result))
            .toEqual([StructureValidationResult.Warning, StructureValidationResult.Error]);
        expect(validations[1]).toMatchObject({
            message: 'Wrong local link', suggestion: 'There is no structure with this url', row: 3, url: 'Other.md'
        });
    });

    it('reports a missing root-relative path as an error', async () => {
        structureExists.mockReturnValue(of(false));
        expect(await validate('[Missing](/missing.md)')).toEqual([{
            ruleId: 'markdown-links', result: StructureValidationResult.Error, row: 3, url: '/missing.md',
            message: 'Wrong local link', suggestion: 'There is no structure with this url'
        }]);
    });

    it.each(['/%ZZ.md', '/%00.md'])('rejects invalid local destinations without a request: %s', async href => {
        expect(await validate(`[Link](${href})`)).toContainEqual(expect.objectContaining({
            result: StructureValidationResult.Error, message: 'Wrong local link'
        }));
        expect(structureExists).not.toHaveBeenCalled();
    });

    it.each(['[Link]()', '[Link]( )', '[Link](<>)'])('reports one error for an empty link: %s', async markdown => {
        expect(await validate(markdown)).toEqual([{
            ruleId: 'markdown-links', result: StructureValidationResult.Error, row: 3, url: '', message: 'Empty link'
        }]);
        expect(structureExists).not.toHaveBeenCalled();
    });

    it('accepts same-document anchors without looking up paths', async () => {
        expect(await validate('[Section](#section)')).toEqual([]);
        expect(structureExists).not.toHaveBeenCalled();
    });

    it('checks absolute links into the same repository as internal links', async () => {
        const href = 'https://github.com/OWNER/repository/blob/main/models/Other.md';
        expect(await validate(`[Other](${href})`)).toContainEqual(expect.objectContaining({
            message: "Link doesn't start from root"
        }));
        expect(structureExists).toHaveBeenCalledWith('owner', 'repository', 'main', 'models/Other.md');
    });

    it('supports raw repository links and branches containing slashes', async () => {
        await service.validate('[Link](https://raw.githubusercontent.com/owner/repository/feature/links/Other.md)', {
            ...repository, branch: 'feature/links'
        });
        expect(structureExists).toHaveBeenCalledWith('owner', 'repository', 'feature/links', 'Other.md');
    });

    it('deduplicates requests for the same path while preserving each issue and row', async () => {
        structureExists.mockReturnValue(of(false));
        const validations = await validate('[First](/missing.md#first)\n[Second](/missing.md#second)');
        expect(structureExists).toHaveBeenCalledTimes(1);
        expect(validations.map(validation => validation.row)).toEqual([3, 4]);
    });

    it('resolves reference links, autolinks, nested formatting, lists, quotes, and tables', async () => {
        const markdown = [
            '[Reference][site]',
            '<http://example.com>',
            '**[Bold](http://example.com)**',
            '- [List](http://example.com)',
            '> [Quote](http://example.com)',
            '',
            '| Link |',
            '| --- |',
            '| [Cell](http://example.com) |',
            '',
            '[site]: http://example.com'
        ].join('\n');
        expect((await validate(markdown)).map(validation => validation.row)).toEqual([3, 4, 5, 6, 7, 11]);
    });

    it('ignores code examples and images without losing the real link row', async () => {
        const markdown = [
            '```md', '[Link](http://example.com)', '```',
            '`[Link](http://example.com)`',
            '![Image](http://example.com)',
            '[Link](http://example.com)'
        ].join('\n');
        expect((await validate(markdown)).map(validation => validation.row)).toEqual([8]);
    });

    it('preserves rows across multiline links, quoted code, and CRLF line endings', async () => {
        const markdown = [
            '> ```md', '> [Link](http://example.com)', '> ```', '',
            '> [Multi', '> line](http://example.com)', '',
            '[Last](http://example.com)'
        ].join('\r\n');
        expect((await validate(markdown)).map(validation => validation.row)).toEqual([7, 10]);
    });

    it('does not turn API access failures into nonexistent-file errors', async () => {
        structureExists.mockReturnValue(throwError(() => new Error('Forbidden')));
        await expect(validate('[Link](/file.md)')).rejects.toThrow('Forbidden');
    });
});
