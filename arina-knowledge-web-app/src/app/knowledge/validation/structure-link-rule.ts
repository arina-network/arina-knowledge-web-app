import { Lexer, Token } from 'marked';

import { StructureValidationResult } from '../constants/structure-validation-result';
import { StructureValidation, StructureValidationContext, StructureValidationRule } from '../models/structure-validation';

interface MarkdownLink {
    href: string;
    row: number;
}

function markdownLinks(source: string): MarkdownLink[] {
    const links: MarkdownLink[] = [];
    let cursor = 0;

    const visit = (tokens: readonly Token[]) => {
        for (const token of tokens) {
            // Container tokens strip list/quote prefixes from their children. Fall back
            // to the first source line when a child's raw text spans those prefixes.
            const exact = source.indexOf(token.raw, cursor);
            const start = exact >= 0 ? exact : source.indexOf(token.raw.split('\n')[0], cursor);
            if (start >= 0) {
                cursor = start;
            }
            if (token.type === 'link') {
                links.push({ href: token.href, row: source.slice(0, cursor).split('\n').length });
            } else if (token.type === 'list') {
                visit(token.items);
            } else if (token.type === 'table') {
                for (const cell of [...token.header, ...token.rows.flat()]) {
                    visit(cell.tokens);
                }
            } else if (token.type !== 'image' && 'tokens' in token && token.tokens) {
                visit(token.tokens);
            }
            if (exact >= 0) {
                cursor = Math.max(cursor, exact + token.raw.length);
            } else if (start >= 0 && !('tokens' in token)) {
                // Skip code blocks even when indentation changes their raw text.
                const lineCount = token.raw.split('\n').length - 1;
                let end = start;
                for (let line = 0; line < lineCount; line++) {
                    const newline = source.indexOf('\n', end);
                    end = newline < 0 ? source.length : newline + 1;
                }
                cursor = Math.max(cursor, end, start + token.raw.split('\n')[0].length);
            }
        }
    };

    visit(Lexer.lex(source));
    return links;
}

function externalUrl(href: string): URL | undefined {
    try {
        if (/[\s\\]|%(?![\da-f]{2})/i.test(href)) {
            return undefined;
        }
        const url = new URL(href.startsWith('//') ? `https:${href}` : href);
        if (['http:', 'https:', 'ftp:'].includes(url.protocol)) {
            return /^(?:(?:https?|ftp):)?\/\/[^/?#]+/i.test(href) && url.hostname ? url : undefined;
        }
        return ['mailto:', 'tel:'].includes(url.protocol) && url.pathname ? url : undefined;
    } catch {
        return undefined;
    }
}

function repositoryPath(url: URL, context: StructureValidationContext): string | undefined {
    const repository = context.repository;
    if (!repository) {
        return undefined;
    }
    const segments = url.pathname.split('/').slice(1).map(segment => decodeURIComponent(segment));
    if (segments[0]?.toLowerCase() !== repository.owner.toLowerCase()
        || segments[1]?.toLowerCase() !== repository.repository.toLowerCase()) {
        return undefined;
    }
    const branch = repository.branch.split('/');
    let remainder: string[];
    if (url.hostname.toLowerCase() === 'github.com') {
        if (segments.length === 2 || (segments.length === 3 && !segments[2])) {
            return '/';
        }
        if (!['blob', 'tree'].includes(segments[2])) {
            return undefined;
        }
        remainder = segments.slice(3);
    } else if (url.hostname.toLowerCase() === 'raw.githubusercontent.com') {
        remainder = segments.slice(2);
    } else {
        return undefined;
    }
    return branch.every((part, index) => remainder[index] === part)
        ? `/${remainder.slice(branch.length).map(segment => encodeURIComponent(segment)).join('/')}`
        : undefined;
}

export const structureLinkRule: StructureValidationRule = {
    id: 'markdown-links',
    async validate(context) {
        const checks = markdownLinks(context.source).map(async link => {
            const results: StructureValidation[] = [];
            const add = (result: StructureValidationResult, message: string, suggestion: string) =>
                results.push({ ruleId: this.id, result, message, suggestion, row: link.row, url: link.href });
            const href = link.href;
            if (href.startsWith('#')) {
                return results;
            }

            let localPath = href;
            const isExternal = /^(?:[a-z][a-z\d+.-]*:|\/\/|www\.|https?\b)/i.test(href);
            if (isExternal) {
                const url = externalUrl(href);
                if (/^http:/i.test(href)) {
                    add(StructureValidationResult.Error, 'Link starts from HTTP', 'Change to https://');
                }
                if (!url) {
                    add(StructureValidationResult.Error, 'Wrong link format', 'Check and fix url');
                    return results;
                }
                let internal: string | undefined;
                try {
                    internal = repositoryPath(url, context);
                } catch {
                    add(StructureValidationResult.Error, 'Wrong link format', 'Check and fix url');
                    return results;
                }
                if (internal === undefined) {
                    return results;
                }
                localPath = internal;
            }

            if (!href.startsWith('/')) {
                add(StructureValidationResult.Warning, "Link doesn't start from root", 'Start link from root path folder');
            }

            let path: string;
            try {
                if (!localPath || /\\|%(?![\da-f]{2})/i.test(localPath)) {
                    throw new Error('Invalid repository path');
                }
                const basePath = (context.repository?.key ?? '').split('/').map(encodeURIComponent).join('/');
                path = decodeURIComponent(new URL(localPath, `https://repository.local/${basePath}`).pathname)
                    .replace(/^\/+|\/+$/g, '');
                if (/[\u0000-\u001f]/.test(path)) {
                    throw new Error('Invalid repository path');
                }
            } catch {
                add(StructureValidationResult.Error, 'Wrong local link', 'There is no structure with thisurl');
                return results;
            }

            if (context.structureExists && !await context.structureExists(path)) {
                add(StructureValidationResult.Error, 'Wrong local link', 'There is no structure with this url');
            }
            return results;
        });
        return (await Promise.all(checks)).flat();
    }
};
