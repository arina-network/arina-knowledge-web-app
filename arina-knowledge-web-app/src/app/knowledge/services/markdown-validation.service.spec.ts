import { TestBed } from '@angular/core/testing';

import { MarkdownValidationContext, MarkdownValidationRule } from '../models/markdown-validation';
import { GENERAL_MARKDOWN_RULES } from '../validation/general-markdown-rules';
import { MARKDOWN_VALIDATION_RULES, MarkdownValidationService } from './markdown-validation.service';

describe('MarkdownValidationService', () => {
    let service: MarkdownValidationService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(MarkdownValidationService);
    });

    it.each([
        '# data object Customer Profile',
        '# model Customer profile with lower case words',
        '# модель Клієнт',
        '# data-object Customer',
        '# model Customer ###',
        '\uFEFF# model Customer'
    ])('accepts an entity title: %s', title => {
        expect(service.validate(`${title}\n\n## description\nDetails.`).every(result =>
            result.status === 'ok'
        )).toBe(true);
    });

    it.each([
        ['# Customer Profile', ['No Entity Type']],
        ['# data object', ['No Entity Name']],
        ['# data oBject Customer', ['No Entity Type']],
        ['# data 123 Customer', ['No Entity Type']],
        ['', ['No Entity Type', 'No Entity Name']],
        ['#', ['No Entity Type', 'No Entity Name']],
        ['## model Customer', ['No Entity Type', 'No Entity Name']],
        ['model Customer', ['No Entity Type', 'No Entity Name']],
        ['\n# model Customer', ['No Entity Type', 'No Entity Name']]
    ])('reports title errors on row 1: %s', (title, messages) => {
        const errors = service.validate(title).filter(result => result.status === 'error');

        expect(errors.map(result => result.message)).toEqual(messages);
        expect(errors.every(result => result.row === 1)).toBe(true);
    });

    it.each(['\n', '\n\n', '\n \t\n\n'])('allows blank lines before the description', separator => {
        const results = service.validate(`# model Customer${separator}## description\nText`);

        expect(results.find(result => result.ruleId === 'description')?.status).toBe('ok');
    });

    it('allows the description to end at the next heading or end of file', () => {
        for (const ending of ['\nText', '\nText\n## properties\n- Name']) {
            expect(service.validate(`# model Customer\n## description${ending}`)
                .find(result => result.ruleId === 'description')?.status).toBe('ok');
        }
    });

    it.each([
        ['# model Customer\nIntro\n\n## description\nText', 4],
        ['# model Customer\n\n## properties\nName\n\n## description', 6],
        ['# model Customer\r\n\r\nIntro\r\n## description', 4],
        ['# model Customer\n\n[link]: /example\n\n## description', 5],
        ['## description\nText', 1]
    ])('reports a misplaced description at its source row', (source, row) => {
        expect(service.validate(source)).toContainEqual({
            ruleId: 'description', status: 'warning', message: 'Description is not first', row
        });
    });

    it.each([
        '# model Customer',
        '# model Customer\n\n### description\nText',
        '# model Customer\n\n## Description\nText',
        '# model Customer\n\ndescription\n---\nText',
        '# model Customer\n\n```md\n## description\n```',
        '# model Customer\n\n~~~md\n## description\n~~~',
        '# model Customer\n\n    ## description',
        '# model Customer\n\n> ## description',
        '# model Customer\n\n<!--\n## description\n-->',
        '# model Customer\n\n- Example\n\n  ## description'
    ])('suggests a description when no section exists: %s', source => {
        expect(service.validate(source)).toContainEqual({
            ruleId: 'description', status: 'suggestion', message: 'No description found, add it', row: 2
        });
    });

    it('locates the real description after an example with the same heading', () => {
        const source = '# model Customer\n\n```md\n## description\n```\n\n## description\nText';

        expect(service.validate(source)).toContainEqual({
            ruleId: 'description', status: 'warning', message: 'Description is not first', row: 7
        });
    });
});

describe('Entity-specific Markdown rules', () => {
    it('runs general rules and only the rules matching the parsed entity type', () => {
        const validate = vi.fn((context: MarkdownValidationContext) => [{
            ruleId: 'data-object-rule', status: 'warning' as const,
            message: context.entityName!, row: 1
        }]);
        const rule: MarkdownValidationRule = {
            id: 'data-object-rule', entityTypes: ['data object'], validate
        };
        TestBed.configureTestingModule({
            providers: [{ provide: MARKDOWN_VALIDATION_RULES, useValue: [...GENERAL_MARKDOWN_RULES, rule] }]
        });
        const service = TestBed.inject(MarkdownValidationService);

        const results = service.validate('# data object Customer Profile\n## description\nText');
        expect(results.filter(result => result.status === 'ok')).toHaveLength(2);
        expect(results).toContainEqual({
            ruleId: rule.id, status: 'warning', message: 'Customer Profile', row: 1
        });

        service.validate('# model Customer');
        service.validate('# Customer');
        expect(validate).toHaveBeenCalledTimes(1);
    });
});
