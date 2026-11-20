import { Token } from 'marked';

export interface MarkdownSourceRows {
    start: number;
    end: number;
}

export function markdownSourceRows(markdown: string, tokens: readonly Token[]): WeakMap<Token, MarkdownSourceRows> {
    const source = markdown.replace(/\r\n?/g, '\n');
    const positions = new WeakMap<Token, MarkdownSourceRows>();
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
            // Nested tokens can omit the source's indentation or quote markers.
            const start = source.indexOf(firstLine, cursor);
            if (start >= 0) {
                advance(start);
            }
            const exact = start >= 0 && source.startsWith(token.raw, start);
            const end = row + token.raw.trimEnd().split('\n').length - 1;
            positions.set(token, { start: row, end });

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
