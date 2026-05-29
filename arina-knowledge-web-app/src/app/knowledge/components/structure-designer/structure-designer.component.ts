import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router'; 
import { FlatTreeControl } from '@angular/cdk/tree';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree'; 


import { AppRoutes } from '@/app/core/constants/app-routes';
// import { StructureTypes } from '../../functions/structure-types';

import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
import { DataNotificationService } from '@/app/core/services/data-notification.service';

import { Structure } from '@/app/knowledge/models/structure';
import { StructureDetailsComponent } from '../structure-details/structure-details.component';
import { StructureTreeNode } from '../structure-tree/structure-tree-node';
import { StructureTreeDataSource } from '../structure-tree/structure-tree-data-source';

import { StructureApiService } from '../../api-services/structure-api.service';

@Component({
    selector: 'app-structure-designer',
    standalone: true,
    imports: [
        RouterLink, 
        RouterLinkActive,
        MatIconModule,
        MatProgressBarModule,
        MatSidenavModule,
        MatTooltipModule,
        MatTreeModule,
        ProgressComponent,
        StructureDetailsComponent
    ],
    templateUrl: './structure-designer.component.html'
})
export class StructureDesignerComponent
    extends BaseDataComponent {

    treeControl: FlatTreeControl<StructureTreeNode>;
    dataSource: StructureTreeDataSource;

    currentRoute: Structure[] = [];
    nodesToExpand: Structure[] = [];
    get currentStructure(): Structure | null {
        if (!(this.currentRoute?.length > 0)) {
            return null;
        }

        return this.currentRoute[this.currentRoute.length - 1];
    }

    getLevel = (node: StructureTreeNode) => node.level;

    isExpandable = (node: StructureTreeNode) => node.expandable;

    hasChild = (_: number, _nodeData: StructureTreeNode) => _nodeData.expandable;

    constructor(
        protected override readonly route: ActivatedRoute,
        protected readonly api: StructureApiService,
        protected readonly dataNotificationService: DataNotificationService,
        // public readonly types: StructureTypes, // used in HTML
        public readonly routes: AppRoutes // used in HTML
    ) {
        super(route);

        this.treeControl = new FlatTreeControl<StructureTreeNode>(this.getLevel, this.isExpandable);

        this.dataSource = new StructureTreeDataSource(this.treeControl, api);
    }

    override initSubsriptions() {
        super.initSubsriptions();

        this.addSubscription(
            this.dataSource.dataChange.subscribe(nodes => this.expandFromRoute(nodes))
        );

        this.addSubscription(this.dataNotificationService.notifications.subscribe(event => {
            if ((event?.structure?.key?.length && 0 > 0)) {
                const node = this.treeControl.dataNodes.find(x => x.key === event?.structure?.key);
                if (node) {
                    node.name = event.structure.name;
                    node.description = event.structure.description;
                }
            }
        }));
    }

    async refreshRootNodes() {
        this.isDataLoading = true;
        try {
            // const p = (await this.api.getStructureTreeRootNodes().toPromise()) as DataPackage;
            const p = this.api.getStructureTreeRootNodes()
            this.dataSource.data = p.map(x => new StructureTreeNode(x.key, x.containerName, x.name, x.description, 0, true, x.isFolder));
            this.showSelectedNode();
        } finally {
            this.isDataLoading = false;
        }
    }

    override async refreshLookupData() {
        await super.refreshLookupData();

        this.refreshRootNodes();
    }

    override async refreshData() {
        // get route and expand
        if (this.key?.length ?? 0 > 0) {
            if (!this.isLastInCurrentRoute(this.key)) {
                this.currentRoute = this.api.getRoute(this.key);
                this.nodesToExpand = [...this.currentRoute];

                this.openRoute();
            }
        } else {
            this.currentRoute = [];
        }
    }

    refreshTree(p: any) {
        this.dataSource.data = p.map(x => new StructureTreeNode(x.key, x.containerKey,  x.name, x.description, 0, true, x.isFolder));

        this.openRoute();
    }

    openRoute() {
        if (!this.dataSource.data || !this.treeControl.dataNodes || !this.nodesToExpand) {
            return;
        }
        if (!(this.nodesToExpand.length > 0)) {
            return;
        }

        const entity = this.nodesToExpand[0];
        const node = this.treeControl.dataNodes.find(x => x.key === entity.key && !x?.isLoading);
        if (node) {
            // remove node from list
            this.nodesToExpand = this.nodesToExpand.filter(x => !(x.key === node.key));
            // expand
            if (!this.treeControl.isExpanded(node)) {
                this.treeControl.expand(node);
            } else if (this.nodesToExpand.length > 0) {
                this.openRoute();
            }

            // scroll to selected node
            if (this.nodesToExpand.length === 0) {
                this.showSelectedNode();
            }
        } else if (!(entity.containerKey?.length ?? 0 > 0)) { // root node was not found
            this.refreshRootNodes();
        } else { // try to find parent node and reopen it
            const parentNode = this.treeControl.dataNodes.find(x =>
                x.key === entity.containerKey && !x?.isLoading);
            if (parentNode && this.treeControl.isExpanded(parentNode)) {
                this.treeControl.collapse(parentNode);
                //this.treeControl.expand(parentNode);
            }
        }
    }

    expandFromRoute(nodes: StructureTreeNode[]) {
        if (!nodes || !this.nodesToExpand) {
            return;
        }

        nodes.forEach(node => {
            const current = this.nodesToExpand.find(x => x.key === node.key);
            if (current) {
                // expand if not expanded and not last
                if (this.nodesToExpand[this.nodesToExpand.length - 1] !== current) {
                    if (this.treeControl.isExpanded(node)) {
                        this.expandFromRoute(this.treeControl.getDescendants(node));
                    }
                    else {
                        this.treeControl.expand(node);
                    }
                }
                // remove node from list
                this.nodesToExpand = this.nodesToExpand.filter(x => !(x.key === node.key));
                // show node
                if (this.nodesToExpand.length === 0) {
                    this.showSelectedNode();
                }
            }
        });
    }

    showSelectedNode() {
        setTimeout(() => {
            const element = document.querySelector('.node-active');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }

    isShowBreadcrumb() {
        if (!this.currentRoute) {
            return false;
        }

        return this.currentRoute.length > 0;
    }

    isLastInCurrentRoute(key: string) {
        if (!this.currentRoute) {
            return false;
        }

        return this.currentRoute[this.currentRoute.length - 1]?.key === key;
    }
}
