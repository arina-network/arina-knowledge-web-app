import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
import { AppSafeHtmlPipe } from '@/app/core/pipes/app-safe-html.pipe';

import { StructureApiService } from '../../api-services/structure-api.service';

@Component({
    selector: 'app-structure-view',
    standalone: true,
    imports: [
        ProgressComponent,
        AppSafeHtmlPipe
    ],
    templateUrl: './structure-view.component.html'
})
export class StructureViewComponent
    extends BaseDataComponent {

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
            const p = this.api.getStructure(this.key);
            // this.messages = p.messages;
            this.title = p.name;
            this.sourceHtml = p.source
        } finally {
            this.isDataLoading = false;
        }
    }
}
