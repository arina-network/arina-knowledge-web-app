import { ChangeDetectorRef, inject, Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, firstValueFrom, from, Observable, of, tap } from 'rxjs';

import { Marked, Renderer, Token } from 'marked';

import { AppParams } from '@/app/core/constants/app-params';
import { AppRoutes } from '@/app/core/constants/app-routes';

import { SourceRows } from '../models/source-rows';
import { StructureApiService } from '../services/structure-api.service';
import { convertToSourceRows } from '../utils/convert-to-source-rows';

@Pipe({
    name: 'markdown',
    standalone: true
})
export class AppMarkdownPipe implements PipeTransform {
    private route = inject(ActivatedRoute);
    protected routes = inject(AppRoutes);
    protected api = inject(StructureApiService);
    protected cdr = inject(ChangeDetectorRef);   
        
    transform(value: string | null | undefined, includeSourceRows = false): Observable<string> {
        // const knowledge = this.routes.knowledge;
        const owner = this.route.snapshot.paramMap.get(AppParams.Owner);
        const repository = this.route.snapshot.paramMap.get(AppParams.Repository);
        const branch = this.route.snapshot.paramMap.get(AppParams.Branch) ?? 'main';

        if (!value || !value.trim()) {        
            return of('');
        }

        let sourceRows: WeakMap<Token, SourceRows> | undefined;
        const rowAttributes = (token: Token) => {
            const rows = sourceRows?.get(token);
            return rows ? ` data-markdown-row="${rows.start}" data-markdown-end-row="${rows.end}"` : '';
        };
        const withSourceRows = <T extends Token>(render: (this: Renderer, token: T) => string) =>
            function (this: Renderer, token: T) {
                return render.call(this, token).replace(/^(<[a-z][\w-]*)/i, `$1${rowAttributes(token)}`);
            };

        // create marked to intercept links
        const localMarked = new Marked({
            async: true,
            hooks: includeSourceRows ? {
                processAllTokens(tokens) {
                    sourceRows = convertToSourceRows(value, tokens);
                    return tokens;
                }
            } : undefined,
            // synchronous Link Renderer Strategy
            renderer: {
                ...(includeSourceRows ? {
                    heading: withSourceRows(Renderer.prototype.heading),
                    paragraph: withSourceRows(Renderer.prototype.paragraph),
                    listitem: withSourceRows(Renderer.prototype.listitem),
                    blockquote: withSourceRows(Renderer.prototype.blockquote),
                    code: withSourceRows(Renderer.prototype.code),
                    table: withSourceRows(Renderer.prototype.table),
                    hr: withSourceRows(Renderer.prototype.hr)
                } : {}),
                link(token) {
                    const href = token.href.startsWith('/')
                        ? `#/knowledge/${owner}/${repository}/${branch}${token.href}`
                        : token.href;
                    // Let Marked render inline formatting in the link label.
                    const html = Renderer.prototype.link.call(this, { ...token, href });
                    return html.replace(/^<a(?=\s|>)/, `<a${rowAttributes(token)}`);
                }
            },
            // asynchronous Token Modifier Strategy for SVGs
            walkTokens: async (token) => {
                if (token.type === 'image' && token.href.startsWith('/') && token.href.endsWith('.svg')) {
                    // console.log('walkTokens svg: ', {token})
                    try {
                        const data = await firstValueFrom(this.api.getStructureRaw(
                            owner ?? '', 
                            repository ?? '', 
                            branch,
                            token.href
                        ))

                        if (data?.content) {
                            const cleanBase64 = data.content.replace(/\s/g, '');
                            const binaryString = atob(cleanBase64);
                            const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));
                            const source = new TextDecoder('utf-8').decode(bytes);
                        
                            token.type = 'html';
                            token.text = source || '';
                        } else {
                            token.type = 'html';
                            token.text = '<div>Diagram Error: no data.</div>';
                        }
                    } catch (e) {
                        token.type = 'html';
                        token.text = `<div>Diagram Error: ${e}</div>`;
                    }
                }
            }
        });

        // parse the markdown to a raw HTML string and return it
        const parsePromise = localMarked.parse(value) as Promise<string>;
        return from(parsePromise).pipe(
            tap(() => this.cdr.detectChanges()),             
            catchError(() => of('AppMarkdownPipe: Error parsing markdown.'))    
        ); 
    }
}
