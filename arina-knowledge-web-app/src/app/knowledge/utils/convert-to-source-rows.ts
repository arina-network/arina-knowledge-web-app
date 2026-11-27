import { Token } from 'marked';

import { SourceRows } from '../models/source-rows';

/** Maps parsed Markdown tokens to inclusive, one-based rows in the original source. */
export function convertToSourceRows(markdown: string, tokens: readonly Token[]): WeakMap<Token, SourceRows> {
    // Match the parser's line endings and count newlines as the cursor moves forward.
    const source = markdown.replace(/\r\n?/g, '\n');
    const positions = new WeakMap<Token, SourceRows>();
    let cursor = 0;
    let row = 1;

    const advance = (offset: number) => {
        while (cursor < offset) {
            if (source[cursor++] === '\n') {
                row++;
            }
        }
    };

    const visit = (children: readonly Token[]) => {
        for (const token of children) {
            const firstLine = token.raw.split('\n', 1)[0];
            // Nested tokens can omit indentation or quote markers on later lines.
            // Locate the first line before checking for a complete match.
            const start = source.indexOf(firstLine, cursor);
            if (start >= 0) {
                advance(start);
            }
            const exact = start >= 0 && source.startsWith(token.raw, start);
            const end = row + token.raw.trimEnd().split('\n').length - 1;
            positions.set(token, { start: row, end });

            // Visit children in source order before moving beyond the parent token.
            if (token.type === 'list') {
                visit(token.items);
            } else if (token.type === 'table') {
                for (const cell of [...token.header, ...token.rows.flat()]) {
                    visit(cell.tokens);
                }
            } else if (token.type !== 'image' && token.type !== 'link' && 'tokens' in token && token.tokens) {
                visit(token.tokens);
            }

            if (exact) {
                advance(start + token.raw.length);
            } else if (start >= 0) {
                // When the source has extra prefixes, finish by counting rows instead of characters.
                while (row < end && cursor < source.length) {
                    const newline = source.indexOf('\n', cursor);
                    advance(newline < 0 ? source.length : newline + 1);
                }
                advance(start + firstLine.length);
            }
        }
    };

    visit(tokens);
    return positions;
}
