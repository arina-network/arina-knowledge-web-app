import { Component, HostListener, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

// import { environment } from '@/environments/environment';
import { AppActions } from '@/app/core/constants/app-actions';
import { AppRoutes } from '@/app/core/constants/app-routes';
// import { AppStorageKeys } from '@/app/core/constants/app-storage-keys';
// import { StructureTypes } from '../../functions/structure-types';
import { StructureDetailsMode } from '../../constants/structure-details-mode';
import { StructureViewMode } from '../../constants/structure-view-mode';

import { StructureApiService } from '@/app/knowledge/api-services/structure-api.service';

import { Message } from '@/app/core/models/message';
import { Structure } from '@/app/knowledge/models/structure';

import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';

import { StructureHomeComponent } from '../structure-home/structure-home.component';
import { StructureViewComponent } from '../structure-view/structure-view.component';

@Component({
    selector: 'app-structure-details',
    standalone: true,
    imports: [
        StructureHomeComponent,
        StructureViewComponent
    ],
    templateUrl: './structure-details.component.html'
})
export class StructureDetailsComponent
    extends BaseDataComponent{

    structure: Structure | null = null;
    @Input() currentRoute: Structure[] = [];

    viewMode = StructureViewMode.View;
    detailsMode = StructureDetailsMode.View;
    modes = StructureViewMode;
    detailsTabIndex = 0; // details

    isShowRelations = false;

    constructor(
        // protected override readonly route: ActivatedRoute,
        protected readonly api: StructureApiService,
        protected readonly router: Router,
        // public readonly types: StructureTypes, // used in HTML
        public readonly routes: AppRoutes, // used in HTML
        // public readonly keys: AppStorageKeys // used in HTML
    ) {
        super();
    }

    @HostListener('click', ['$event'])
    onClick(event: MouseEvent) {
        // Do nothing if no anchor tag.
        if (event.target instanceof HTMLAnchorElement === false) {
            return;
        }

        // Prevent normal html anchor behaviour
        event.preventDefault();

        // handle valid angular route path
        const target = <HTMLAnchorElement>event.target;
        this.router.navigate([target.pathname]);
    }

    override async refreshData() {
        // this.detailsTabIndex = 0;
        // this.detailsMode = StructureDetailsMode.View;

        // if (this.structure?.key !== this.key) {
        //     if (this.key?.length ?? 0 > 0) {
        //         if (this.structure?.key !== this.key) {
        //             this.setStructure(this.api.getStructure(this.key));
        //         }
        //     } else {
        //         this.structure = null;
        //     }
        // }
    }

    setStructure(p: any) {
        // this.messages = p.messages;

        if (!p) {
            this.structure = null;
            return;
        }

        this.structure = p as Structure;
    }

    setMessages(messages: Message[]) {
        this.messages = messages;
    }

    setDetailsMode(mode: StructureDetailsMode) {
        this.detailsMode = mode;
    }

    setDetailsTabIndex(index: number) {
        this.detailsTabIndex = index >=  0 && this.detailsTabIndex >= 0 ? index : 0;
    }

    isEmpty() {
        return !this.owner || !this.repository;
        // return !(this.key?.length ?? 0 > 0);
    }

    isShow() {
        return this.owner && this.repository;
        // if (!(this.key?.length ?? 0 > 0)) {
        //     return false;
        // }

        // return !this.action || this.action === AppActions.Show;
    }

    isShowSource() {
        if (!(this.key?.length ?? 0 > 0)) {
            return false;
        }

        return this.action === AppActions.Source;
    }

    isShowBreadcrumb() {
        if (!this.currentRoute) {
            return false;
        }

        return this.currentRoute.length > 0;
    }

    stopProcessing(event: Event) {
        event.stopPropagation();
    }

    showInGitHub() {
        if (!(this.key?.length ?? 0 > 0)) {
            return;
        }

        // window.open(environment.knowledgeUrl + '/arina/show/' + this.key, '_blank');
    }

    setPanelState(key: string, isOpen: boolean) {
        localStorage.setItem(key,  String(isOpen));
    }

    getPanelState(key: string): boolean {
        return Boolean(localStorage.getItem(key));
    }
}
