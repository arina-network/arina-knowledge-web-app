import { inject, Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import * as marked from 'marked';

import { AppParams } from '../constants/app-params';
import { AppRoutes } from '../constants/app-routes';

@Pipe({
    name: 'markdown',
    standalone: true
})
export class AppMarkdownPipe implements PipeTransform {
    private route = inject(ActivatedRoute);
    protected routes = inject(AppRoutes);
        
    transform(value: string | null | undefined): string {
        const knowledge = this.routes.knowledge;
        const owner = this.route.snapshot.paramMap.get(AppParams.Owner);
        const repository = this.route.snapshot.paramMap.get(AppParams.Repository);
        const branch = this.route.snapshot.paramMap.get(AppParams.Branch) ?? 'main';

        if (!value) {        
            return '';
        }

        // Configure marked to intercept links
        marked.use({
            renderer: {
                link({ href, title, text }) {
                    let finalHref = href;

                    if (href.startsWith('/')) { // process only local links
                        finalHref = `${knowledge}/${owner}/${repository}/${branch}/${href}`
                    }

                    const titleAttr = title ? ` title="${title}"` : '';
                    return `<a href="${finalHref}"${titleAttr}>${text}</a>`;
                }
            }
        });

        // parse the markdown to a raw HTML string and return it
        return marked.parse(value) as string; 
    }
}