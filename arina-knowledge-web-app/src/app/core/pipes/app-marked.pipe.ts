import { ChangeDetectorRef, inject, Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, firstValueFrom, from, Observable, of, tap } from 'rxjs';

import { Marked } from 'marked';

import { AppParams } from '../constants/app-params';
import { AppRoutes } from '../constants/app-routes';

import { StructureApiService } from '@/app/knowledge/api-services/structure-api.service';

@Pipe({
    name: 'markdown',
    standalone: true
})
export class AppMarkdownPipe implements PipeTransform {
    private route = inject(ActivatedRoute);
    protected routes = inject(AppRoutes);
    protected api = inject(StructureApiService);
    protected cdr = inject(ChangeDetectorRef);   
        
    transform(value: string | null | undefined): Observable<string> {
        const knowledge = this.routes.knowledge;
        const owner = this.route.snapshot.paramMap.get(AppParams.Owner);
        const repository = this.route.snapshot.paramMap.get(AppParams.Repository);
        const branch = this.route.snapshot.paramMap.get(AppParams.Branch) ?? 'main';

        if (!value || !value.trim()) {        
            return of('');
        }

        // create marked to intercept links
        const localMarked = new Marked({
            async: true,
            // synchronous Link Renderer Strategy
            renderer: {
                link({ href, title, text }) {
                    let finalHref = href;

                    if (href.startsWith('/')) { // process only local links
                        finalHref = `${knowledge}/${owner}/${repository}/${branch}/${href}`
                    }

                    const titleAttr = title ? ` title="${title}"` : '';
                    // console.log('completed: ', {finalHref})
                    return `<a href="${finalHref}"${titleAttr}>${text}</a>`;
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