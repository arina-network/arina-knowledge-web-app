import { ChangeDetectorRef, Component, inject, input, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { AppMarkdownPipe } from '@/app/core/pipes/app-marked.pipe';
import { AppSafeHtmlPipe } from '@/app/core/pipes/app-safe-html.pipe';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
import { NotificationService } from '@/app/core/services/notification.service';

import { StructureApiService } from '../../api-services/structure-api.service';

@Component({
    selector: 'app-structure-content',
    standalone: true,
    imports: [
        AsyncPipe,
        ProgressComponent,
        AppMarkdownPipe,
        AppSafeHtmlPipe
    ],
    templateUrl: './structure-content.component.html'
})
export class StructureContentComponent {
    protected cdr = inject(ChangeDetectorRef);   

    protected notificationService = inject(NotificationService);        

    protected api = inject(StructureApiService);

    public isDataLoading = signal<boolean>(false);

    owner = input<string>();
    repository = input<string>();
    branch = input<string>();
    key = input<string>();    
    
    // @Input() owner?: string;
    // @Input() repository?: string;
    // @Input() branch?: string;
    // @Input() key?: string;

    // protected owner?: string;
    // protected repository?: string;
    // protected branch?: string;
    // protected key?: string;

    public source = signal<string | undefined>(undefined);

    ngOnInit() {
        this.refreshData();
    }
    
    async refreshData(
        // newOwner: string,
        // newRepository: string,
        // newBranch: string,
        // newKey: string
    ) {
        console.log('StructureContentComponent.refreshData()', {owner: this.owner(), repository: this.repository(), branch: this.branch(), key: this.key()});

        this.isDataLoading.set(true);

        // this.owner = newOwner;
        // this.repository = newRepository;
        // this.branch = newBranch;
        // this.key = newKey;

        this.api.getStructureRaw(
            this.owner(), 
            this.repository(), 
            this.branch() ?? 'main',
            this.key()
        ).subscribe({
            next: (data) => {
                this.clearData()

                // no data
                if (!data) {
                    this.clearData()
                    this.isDataLoading.set(false);

                    // this.notificationService.showError('GitHub returns no data.');

                    return;
                }

                // content
                if (data.content) {
                    this.isDataLoading.set(false);

                    this.setSource(data)

                    // this.rawUrl = data.download_url;
                    // this.githubUrl = `${this.routes.github}/${this.owner}/${this.repository}/${this.routes.githubBlob}/${this.branch}/${this.key}`;
                } else {
                    this.clearData()
                    this.isDataLoading.set(false);
                }

                // this.cdr.detectChanges(); 
            },
            error: (err) => {
                this.clearData()
                this.isDataLoading.set(false);

                this.notificationService.showError('Error fetching Raw Data from GitHub: ' + err.message);
            }
        });
    }

    protected clearData() {
        // this.githubUrl = undefined;

        // this.title = undefined;
        this.source.set(undefined);
        // this.rawUrl = undefined;
    }
    
    protected setSource(data: any) {
        const cleanBase64 = data.content.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));

        this.source.set(new TextDecoder('utf-8').decode(bytes));
    }
}