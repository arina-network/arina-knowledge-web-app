import { Component, inject } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';

import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
import { NotificationService } from '@/app/core/services/notification.service';
import { AppMarkdownPipe } from '@/app/core/pipes/app-marked.pipe';
import { AppSafeHtmlPipe } from '@/app/core/pipes/app-safe-html.pipe';

import { StructureApiService } from '../../api-services/structure-api.service';

@Component({
    selector: 'app-structure-view',
    standalone: true,
    imports: [
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
    // protected routes = inject(AppRoutes);
    
    title: string | undefined;    
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
}
