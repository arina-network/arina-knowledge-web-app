import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
    private cdr = inject(ChangeDetectorRef);   

    protected notificationService = inject(NotificationService);        
   
    protected api = inject(StructureApiService);
    // protected routes = inject(AppRoutes);
    
    title: string | undefined;    
    sourceHtml: string | undefined;

    override async refreshData() {
        this.api.getStructureRaw(
            this.owner, 
            this.repository, 
            this.branch,
            this.key
        ).subscribe({
            next: (data) => {
                this.title = this.key;

                if (!data || !data.content) {
                    this.sourceHtml = '';
                    this.isDataLoading = false;
                    return;
                }

                const cleanBase64 = data.content.replace(/\s/g, '');
                const binaryString = atob(cleanBase64);
                const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));

                this.sourceHtml = new TextDecoder('utf-8').decode(bytes);
                
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
