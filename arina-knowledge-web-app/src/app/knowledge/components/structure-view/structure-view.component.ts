import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { Breadcrumb } from '@/app/core/models/breadcrumb';
import { AppMarkdownPipe } from '@/app/core/pipes/app-marked.pipe';
import { AppSafeHtmlPipe } from '@/app/core/pipes/app-safe-html.pipe';
import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
import { NotificationService } from '@/app/core/services/notification.service';


import { StructureApiService } from '../../api-services/structure-api.service';

@Component({
    selector: 'app-structure-view',
    standalone: true,
    imports: [
        RouterLink,
        MatDividerModule,
        MatIconModule,
        ProgressComponent,
        AppMarkdownPipe,
        AppSafeHtmlPipe
    ],
    templateUrl: './structure-view.component.html'
})
export class StructureViewComponent
    extends BaseDataComponent {

    protected notificationService = inject(NotificationService);        
   
    protected api = inject(StructureApiService);
    protected routes = inject(AppRoutes);
    
    title: string | undefined;
    githubUrl: string | undefined;    
    rawUrl: string | undefined;
    sourceHtml: string | undefined;

    override async refreshData() {
        this.isDataLoading = true;

        const branchOrMain = this.branch ?? 'main';
        const keyOrReadme = this.key?.includes('.') ? this.key : 
            (this.key ? `${this.key}/README.md` : 'README.md');

        this.api.getStructureRaw(
            this.owner, 
            this.repository, 
            branchOrMain,
            keyOrReadme
        ).subscribe({
            next: (data) => {
                this.title = keyOrReadme;

                if (!data || !data.content) {
                    this.sourceHtml = '';
                    this.isDataLoading = false;
                    return;
                }

                const cleanBase64 = data.content.replace(/\s/g, '');
                const binaryString = atob(cleanBase64);
                const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));

                this.sourceHtml = new TextDecoder('utf-8').decode(bytes);

                this.rawUrl = data.download_url;
                this.githubUrl = `${this.routes.github}/${this.owner}/${this.repository}/${this.routes.githubBlob}/${this.branch}/${this.key}`;
                // console.log('getStructureRaw:', this.sourceHtml);

                this.isDataLoading = false;

                this.cdr.detectChanges(); 
            },
            error: (err) => {
                this.notificationService.showError('Error fetching Raw Data from GitHub: ' + err.message);
                this.isDataLoading = false;
            }
        });
    }


    get isShowBreadcrumb() : boolean {
        return !!this.key;
    }

    // get githubUrl() : string | undefined {
    //     if (!this.key) {
    //         return undefined;
    //     }

    //     return `${this.routes.github}/${this.owner}/${this.repository}/${this.routes.githubBlob}/${this.branch}/${this.key}`;
    // }

    get breadcrumbs() : Breadcrumb[] {
        const result: Breadcrumb[] = [];

        // empty route
        if (!(this.key?.length ?? 0 > 0)) {
            return result;
        }


        const route = this.key?.split('/').filter(x => x?.length > 0) ?? [];
        for (let i = 0; i < route.length; i++) {
            result.push({
                name: route[i]!,
                url: `/${this.routes.knowledge}/${this.owner}/${this.repository}/${this.branch}/${route.slice(0, i + 1).join('/')}`
            });
        }

        return result;
    }    
}
