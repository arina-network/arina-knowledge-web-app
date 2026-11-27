import { Lexer } from 'marked';

import { StructureValidationResult } from '../../constants/structure-validation-result';
import { StructureValidationRule } from '../../models/validation/structure-validation-rule';

/**
 * Looks for a top-level `## description` heading. Suggests adding it if absent
 * and warns if it does not follow row 1. Blank lines between the two are allowed.
 */
export const structureDescriptionRule: StructureValidationRule = {
    id: 'description',
    validate({ source, lines }) {
        let offset = 0;

        // Top-level Markdown tokens exclude headings inside code, quotes, and lists.
        for (const token of Lexer.lex(source)) {
            // Definitions can be omitted from tokens, so locate raw text in the source.
            const tokenOffset = source.indexOf(token.raw, offset);
            offset = tokenOffset + token.raw.length;

            if (token.type !== 'heading' || token.depth !== 2 || token.text !== 'description'
                || !/^ {0,3}##[ \t]/.test(token.raw)) {
                continue;
            }

            const row = source.slice(0, tokenOffset).split('\n').length;
            const isFirst = row > 1 && lines.slice(1, row - 1).every(line => !line.trim());

            return [{
                ruleId: this.id,
                result: isFirst ? StructureValidationResult.Ok : StructureValidationResult.Warning,
                message: isFirst ? 'Description is first' : 'Description is not first',
                suggestion: isFirst ? undefined : 'Move ## description directly after the title.',
                row
            }];
        }

        return [{
            ruleId: this.id,
            result: StructureValidationResult.Suggestion,
            message: 'No description found',
            suggestion: 'Add a Descrition',
            row: 2
        }];
    }
};
