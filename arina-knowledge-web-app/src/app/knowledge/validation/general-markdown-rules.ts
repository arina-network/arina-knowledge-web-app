import { Lexer } from 'marked';

import { MarkdownValidationResult, MarkdownValidationRule } from '../models/markdown-validation';

const entityTitleRule: MarkdownValidationRule = {
    id: 'entity-title',
    validate({ entityType, entityName }) {
        const results: MarkdownValidationResult[] = [];

        if (!entityType) {
            results.push({ ruleId: this.id, status: 'error', message: 'No Entity Type', row: 1 });
        }
        if (!entityName) {
            results.push({ ruleId: this.id, status: 'error', message: 'No Entity Name', row: 1 });
        }

        return results.length ? results : [
            { ruleId: this.id, status: 'ok', message: 'Entity title is valid', row: 1 }
        ];
    }
};

const descriptionRule: MarkdownValidationRule = {
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
                status: isFirst ? 'ok' : 'warning',
                message: isFirst ? 'Description is first' : 'Description is not first',
                row
            }];
        }

        return [{
            ruleId: this.id,
            status: 'suggestion',
            message: 'No description found, add a descrition',
            row: 2
        }];
    }
};

export const GENERAL_MARKDOWN_RULES: readonly MarkdownValidationRule[] = [entityTitleRule, descriptionRule];
