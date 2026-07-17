import { Component, effect, HostListener, inject, Input } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';

// import { environment } from '@/environments/environment';
// import { AppActions } from '@/app/core/constants/app-actions';
// import { AppRoutes } from '@/app/core/constants/app-routes';
// import { AppStorageKeys } from '@/app/core/constants/app-storage-keys';
// import { StructureTypes } from '../../functions/structure-types';
// import { StructureDetailsMode } from '../../constants/structure-details-mode';
// import { StructureViewMode } from '../../constants/structure-view-mode';

// import { StructureApiService } from '@/app/knowledge/api-services/structure-api.service';

// import { Message } from '@/app/core/models/message';
// import { Structure } from '@/app/knowledge/models/structure';

// import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';

import { StructureHomeComponent } from '../structure-home/structure-home.component';
import { StructureViewComponent } from '../structure-view/structure-view.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppParams } from '@/app/core/constants/app-params';

@Component({
    selector: 'app-structure-details',
    standalone: true,
    imports: [
        StructureHomeComponent,
        StructureViewComponent
    ],
    templateUrl: './structure-details.component.html'
})
export class StructureDetailsComponent {

    protected route = inject(ActivatedRoute);
    protected router = inject(Router);
    protected events = toSignal(this.router.events);

    protected owner?: string;
    protected repository?: string;
    protected branch?: string;
    protected key?: string;
    
    constructor() {
        effect(() => {
            const currentEvent = this.events();
            if (currentEvent instanceof NavigationEnd) {
                const urlTree = this.router.parseUrl(this.router.url);
                const segments = urlTree.root.children['primary']?.segments || [];
                
                const newKey = segments.length >= 5 ? 
                    segments.slice(4).map(s => s.path).join('/') :
                    undefined;

                this.refreshData(
                    this.route.snapshot.paramMap.get(AppParams.Owner) || '',
                    this.route.snapshot.paramMap.get(AppParams.Repository) || '',
                    this.route.snapshot.paramMap.get(AppParams.Branch) || 'main',
                    newKey
                )
            }
        });        
    }  

    async refreshData(
        newOwner: string,
        newRepository: string,
        newBranch: string,
        newKey?: string        
    ) {
        this.owner = newOwner;
        this.repository = newRepository;
        this.branch = newBranch;
        this.key = newKey;        
    }

    isEmpty() {
        return !this.owner || !this.repository;
    }

    isView() {
        return this.owner && this.repository;
    }
}
