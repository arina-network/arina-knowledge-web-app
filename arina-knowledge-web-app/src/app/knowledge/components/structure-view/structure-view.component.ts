import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
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
import { StructureLink } from '../../models/structure-link';

@Component({
    selector: 'app-structure-view',
    standalone: true,
    imports: [
        AsyncPipe,
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
    source: string | undefined;
    contentLinks: StructureLink[] = [];  

    override async refreshData() {
        this.isDataLoading.set(true);

        this.api.getStructureRaw(
            this.owner, 
            this.repository, 
            this.branch ?? 'main',
            this.key
        ).subscribe({
            next: (data) => {
                this.clearData()

                // no data
                if (!data) {
                    this.isDataLoading.set(false);

                    // this.notificationService.showError('GitHub returns no data.');

                    return;
                }

                // content
                if (data.content) {
                    this.isDataLoading.set(false);

                    this.setSource(data)

                    this.rawUrl = data.download_url;
                    this.githubUrl = `${this.routes.github}/${this.owner}/${this.repository}/${this.routes.githubBlob}/${this.branch}/${this.key}`;
                } else {
                    let readme: any = undefined;
                    data.map(item => {
                        const parsedUrl = new URL(item.url);
                        const segments = parsedUrl.pathname.split('/');
                        
                        const ownerName = segments[2]
                        const repositoryName = segments[3]
                        const branchName = parsedUrl.searchParams.get('ref')

                        const itemUrl = `${this.routes.knowledge}/${ownerName}/${repositoryName}/${branchName}/${item.path}`

                        if (item.name === 'README.md') {
                            readme = item;
                        }

                        this.contentLinks.push({
                            name: item.name,
                            url: itemUrl,
                            isFolder: item.type === 'dir'

                        })                                        
                    })

                    if (!readme) {
                        this.isDataLoading.set(false);
                        return;
                    }

                    this.api.getStructureRaw(
                        this.owner, 
                        this.repository, 
                        this.branch ?? 'main',
                        `${readme.path}`
                    ).subscribe({                        
                        next: (readmeData) => {
                            if (readmeData?.content) {
                                this.isDataLoading.set(false);

                                this.setSource(readmeData)
                                
                                this.rawUrl = undefined;
                                this.githubUrl = undefined;
                                this.contentLinks = [];
                            } else {
                                this.isDataLoading.set(false);

                                this.title = this.key;
                                this.source = undefined;
                                this.rawUrl = undefined;
                                this.githubUrl = undefined;
                            }
                        },
                        error: (err) => {
                            this.clearData()
                            this.isDataLoading.set(false);

                            this.notificationService.showError('Error fetching README.md from GitHub: ' + err.message);
                        }
                    });                   
                }

                this.cdr.detectChanges(); 
            },
            error: (err) => {
                this.clearData()
                this.isDataLoading.set(false);

                this.notificationService.showError('Error fetching Raw Data from GitHub: ' + err.message);
            }
        });
    }

    protected setSource(data: any) {
        const cleanBase64 = data.content.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));

        this.title = this.key;
        this.source = new TextDecoder('utf-8').decode(bytes);
    }

    protected clearData() {
        this.title = undefined;
        this.source = undefined;
        this.rawUrl = undefined;
        this.githubUrl = undefined;
        this.contentLinks = [];
    }

    get isShowBreadcrumb() : boolean {
        return !!this.key;
    }

    get breadcrumbs() : Breadcrumb[] {
        const result: Breadcrumb[] = [];

        // empty route
        if (!(this.key?.length ?? 0 > 0)) {
            return result;
        }

        result.push({
            name: this.repository!,
            url: `/${this.routes.knowledge}/${this.owner}/${this.repository}/${this.branch}`
        });

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
