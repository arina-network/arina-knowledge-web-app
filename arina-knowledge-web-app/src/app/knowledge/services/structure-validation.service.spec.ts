import { TestBed } from '@angular/core/testing';

import { StructureValidationResult } from '../constants/structure-validation-result';
import { StructureValidationContext, StructureValidationRule } from '../models/structure-validation';
import { STRUCTURE_RULES } from '../validation/structure-rules';
import { STRUCTURE_VALIDATION_RULES, StructureValidationService } from './structure-validation.service';
import { StructureApiService } from './structure-api.service';

describe('StructureValidationService', () => {
    let service: StructureValidationService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [{ provide: StructureApiService, useValue: {} }] });
        service = TestBed.inject(StructureValidationService);
    });

    it.each([
        '# data object Customer Profile',
        '# model Customer profile with lower case words',
        '# модель Клієнт',
        '# data-object Customer',
        '# model Customer ###',
        '\uFEFF# model Customer'
    ])('accepts an entity title: %s', async title => {
        expect((await service.validate(`${title}\n\n## description\nDetails.`)).every(result =>
            result.result === StructureValidationResult.Ok
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
    ])('reports title errors on row 1: %s', async (title, messages) => {
        const errors = (await service.validate(title)).filter(result => result.result === StructureValidationResult.Error);

        expect(errors.map(result => result.message)).toEqual(messages);
        expect(errors.every(result => result.row === 1)).toBe(true);
    });

    it.each(['\n', '\n\n', '\n \t\n\n'])('allows blank lines before the description', async separator => {
        const results = await service.validate(`# model Customer${separator}## description\nText`);

        expect(results.find(result => result.ruleId === 'description')?.result).toBe(StructureValidationResult.Ok);
    });

    it('allows the description to end at the next heading or end of file', async () => {
        for (const ending of ['\nText', '\nText\n## properties\n- Name']) {
            expect((await service.validate(`# model Customer\n## description${ending}`))
                .find(result => result.ruleId === 'description')?.result).toBe(StructureValidationResult.Ok);
        }
    });

    it.each([
        ['# model Customer\nIntro\n\n## description\nText', 4],
        ['# model Customer\n\n## properties\nName\n\n## description', 6],
        ['# model Customer\r\n\r\nIntro\r\n## description', 4],
        ['# model Customer\n\n[link]: /example\n\n## description', 5],
        ['## description\nText', 1]
    ])('reports a misplaced description at its source row', async (source, row) => {
        expect(await service.validate(source)).toContainEqual({
            ruleId: 'description', result: StructureValidationResult.Warning, message: 'Description is not first', row,
            suggestion: 'Move ## description directly after the title.'
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
    ])('suggests a description when no section exists: %s', async source => {
        expect(await service.validate(source)).toContainEqual({
            ruleId: 'description', result: StructureValidationResult.Suggestion, message: 'No description found', row: 2,
            suggestion: 'Add a Descrition'
        });
    });

    it('locates the real description after an example with the same heading', async () => {
        const source = '# model Customer\n\n```md\n## description\n```\n\n## description\nText';

        expect(await service.validate(source)).toContainEqual({
            ruleId: 'description', result: StructureValidationResult.Warning, message: 'Description is not first', row: 7,
            suggestion: 'Move ## description directly after the title.'
        });
    });
});

describe('Entity-specific structure rules', () => {
    it('runs general rules and only the rules matching the parsed entity type', async () => {
        const validate = vi.fn((context: StructureValidationContext) => [{
            ruleId: 'data-object-rule', result: StructureValidationResult.Warning,
            message: context.entityName!, row: 1
        }]);
        const rule: StructureValidationRule = {
            id: 'data-object-rule', entityTypes: ['data object'], validate
        };
        TestBed.configureTestingModule({
            providers: [
                { provide: STRUCTURE_VALIDATION_RULES, useValue: [...STRUCTURE_RULES, rule] },
                { provide: StructureApiService, useValue: {} }
            ]
        });
        const service = TestBed.inject(StructureValidationService);

        const results = await service.validate('# data object Customer Profile\n## description\nText');
        expect(results.filter(result => result.result === StructureValidationResult.Ok)).toHaveLength(2);
        expect(results).toContainEqual({
            ruleId: rule.id, result: StructureValidationResult.Warning, message: 'Customer Profile', row: 1
        });

        await service.validate('# model Customer');
        await service.validate('# Customer');
        expect(validate).toHaveBeenCalledTimes(1);
    });
});
