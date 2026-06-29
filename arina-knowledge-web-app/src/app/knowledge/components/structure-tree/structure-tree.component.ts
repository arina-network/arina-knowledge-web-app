import { Component } from '@angular/core';
import { NgClass, KeyValuePipe } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FlatTreeControl } from '@angular/cdk/tree';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';

import { StructureApiService } from '../../api-services/structure-api.service';
import { DataNotificationService } from '@/app/core/services/data-notification.service';

import { AppInfo } from '@/app/core/constants/app-info';
// import { StructureTypes } from '../../functions/structure-types';

import { Structure } from '../../models/structure';
import { StructureTreeNode } from './structure-tree-node';
import { StructureTreeDataSource } from './structure-tree-data-source';

import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';


@Component({
    selector: 'app-structure-tree',
    standalone: true,
    imports: [
        NgClass,
        DragDropModule,
        MatIconModule,
        MatProgressBarModule,
        MatTooltipModule,
        MatTreeModule,
        ProgressComponent
    ],
    templateUrl: './structure-tree.component.html'
})
export class StructureTreeComponent
    extends BaseDataComponent {

    protected get code(): string {
        return this.constructor?.name;
    }

    protected get settingsCode(): string {
        return 'settings';
    }

    protected get settingsStorageCode(): string {
        return `${AppInfo.companyName}_${AppInfo.applicationName}_${this.code}_${this.settingsCode}`;
    }

    treeControl: FlatTreeControl<StructureTreeNode>;
    dataSource: StructureTreeDataSource;

    selectedNode: StructureTreeNode

    currentRoute: Structure[] = null;
    nodesToExpand: Structure[] = null;
    get currentStructure(): Structure {
        if (!(this.currentRoute?.length > 0)) {
            return null;
        }

        return this.currentRoute[this.currentRoute.length - 1];
    }

    getLevel = (node: StructureTreeNode) => node.level;

    isExpandable = (node: StructureTreeNode) => node.expandable;

    hasChild = (_: number, _nodeData: StructureTreeNode) => _nodeData.expandable;

    constructor(
        // protected override readonly route: ActivatedRoute,
        protected readonly api: StructureApiService,
        protected readonly dataNotificationService: DataNotificationService
        // public readonly types: StructureTypes
    ) {
        super();

        this.treeControl = new FlatTreeControl<StructureTreeNode>(this.getLevel, this.isExpandable);

        this.dataSource = new StructureTreeDataSource(this.treeControl, api);
    }

    override initSubsriptions() {
        super.initSubsriptions();

        this.addSubscription(
            this.dataSource.dataChange.subscribe(nodes => this.expandFromRoute(nodes))
        );

        this.addSubscription(this.dataNotificationService.notifications.subscribe(event => {
            if (event?.structure?.key?.length && 0 > 0) {
                const node = this.treeControl.dataNodes.find(x => x.key === event?.structure?.key);
                node.name = event.structure.name;
                node.description = event.structure.description;
            }
        }));
    }

    async refreshRootNodes() {
        this.isDataLoading.set(true);
        // this.isDataLoading = true;
        try {
            // const p = this.api.getStructureTreeRootNodes();
            // this.dataSource.data = p.map(x => new StructureTreeNode(x.key, x.containerKey, x.name, x.description, 0, true));
            // await this.restoreSelectedNode();
        } finally {
            this.isDataLoading.set(false);
            // this.isDataLoading = false;
        }
    }

    override async refreshLookupData() {
        await super.refreshLookupData();

        this.refreshRootNodes();
    }

    refreshTree(p: any) {
        this.dataSource.data = p.map(x => new StructureTreeNode(x.key, x.containerKey, x.name, x.description, 0, true, x.isFolder));
    }

    async  selectNode(node: StructureTreeNode) {
        this.selectedNode = node;
        localStorage.setItem(this.settingsStorageCode, String(node?.key));
    }

    async restoreSelectedNode() {
        var key = localStorage.getItem(this.settingsStorageCode);
        if (key?.length && 0 > 0) {
            if (!this.isLastInCurrentRoute(key)) {
                this.currentRoute = [] // OLD (await this.api.getRoute(KeyValuePipe).toPromise()).data;
                this.nodesToExpand = [...this.currentRoute];

                this.openRoute();
            }
        }
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
            this.selectedNode = node;
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
        // } else if (!(entity.parentId > 0)) { // root node was not found
        //     this.refreshRootNodes();
        } else { // try to find parent node and reopen it
            const parentNode = this.treeControl.dataNodes.find(x =>
                x.key === entity.containerKey && !x?.isLoading);
            if (parentNode && this.treeControl.isExpanded(parentNode)) {
                this.treeControl.collapse(parentNode);
                this.treeControl.expand(parentNode);
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
                this.selectedNode = node;
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
            const element = document.querySelector('.node-selected');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }

    isLastInCurrentRoute(key: string) {
        if (!this.currentRoute) {
            return false;
        }

        return this.currentRoute[this.currentRoute.length - 1].key === key;
    }
}
