import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
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

    title: string | undefined;    
    sourceHtml: string | undefined;

    constructor(
        protected override readonly route: ActivatedRoute,
        protected readonly api: StructureApiService
    ) {
        super(route);
    }

    override async refreshData() {
        this.isDataLoading = true;
        try {
            // const p = (await this.api.getStructureTreeRootNodes().toPromise()) as DataPackage;
            this.api.getStructureRaw().subscribe({
                next: (data) => {
                    this.title = this.key;

                    const cleanBase64 = data.content.replace(/\s/g, '');
                    const binaryString = atob(cleanBase64);
                    const bytes = Uint8Array.from(binaryString, m => m.charCodeAt(0));
    
                    this.sourceHtml = new TextDecoder('utf-8').decode(bytes);
                    
                    console.log('Raw Structure content fetched successfully:', this.sourceHtml);
                    // this.sourceHtml = data

                    this.isDataLoading = false;

                    this.cdr.detectChanges(); 
                },
                error: (err) => {
                    console.error('Error fetching Raw Structure from GitHub:', err);
                    this.isDataLoading = false;
                }
            });

            // const p = this.api.getStructureTreeRootNodes()
            // this.dataSource.data = p.map(x => new StructureTreeNode(x.key, x.containerName, x.name, x.description, 0, true, x.isFolder));
            // this.showSelectedNode();
        } finally {
            this.isDataLoading = false;
        }

        // this.isDataLoading = true;
        // try {
        //     const p = this.api.getStructure(this.key);
        //     // this.messages = p.messages;
        //     this.title = p.name;
        //     this.sourceHtml = p.source
        // } finally {
        //     this.isDataLoading = false;
        // }
    }
}
