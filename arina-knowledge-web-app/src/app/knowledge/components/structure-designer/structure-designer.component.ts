import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router'; 

import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTree, MatTreeModule } from '@angular/material/tree'; 


import { AppRoutes } from '@/app/core/constants/app-routes';

import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';
import { DataNotificationService } from '@/app/core/services/data-notification.service';

import { Structure } from '@/app/knowledge/models/structure';
import { StructureDetailsComponent } from '../structure-details/structure-details.component';
import { StructureTreeNode } from '../structure-tree/structure-tree-node';

import { StructureApiService } from '../../api-services/structure-api.service';
import { RepositoryService } from '../../services/repository.service';

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

    protected dataNotificationService = inject(DataNotificationService);    
    protected repositoryService = inject(RepositoryService);
    protected routes = inject(AppRoutes);

    protected api = inject(StructureApiService);

    dataSource = signal<StructureTreeNode[]>([]);

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

    hasChild = (_: number, node: StructureTreeNode) => node.expandable;

    getChildren = (node: StructureTreeNode) => node.children ?? [];

    convertToNodes(data: any[]): StructureTreeNode[] {
        const nodes = data.map(x => 
            new StructureTreeNode(
                x.path, 
                undefined, 
                x.name, 
                undefined, 
                0, 
                x.type === 'dir', 
                x.type === 'dir' 
            )
        );

        const sortedNodes = nodes.sort((a: StructureTreeNode, b: StructureTreeNode) => {
            if (a.isFolder && !b.isFolder) {
                return -1;   
            } else if (!a.isFolder && b.isFolder) {
                return 1;    
            } else if (!a.name){
                return -1;
            }

            return a.name.localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
        });

        return sortedNodes;
    }        

    async refreshRootNodes() {
        this.isDataLoading = true;

        this.api.getStructureTreeRootNodes(
            this.owner, 
            this.repository, 
            this.branch
        ).subscribe({
            next: (data) => {
                this.dataSource.set(this.convertToNodes(data));

                this.isDataLoading = false;
            },
            error: (err) => {
                console.error('Error fetching Root Nodes from GitHub:', err);
                this.isDataLoading = false;
            }
        });
    }

    onNodeToggle(tree: MatTree<StructureTreeNode>, node: StructureTreeNode) {
        // if the branch is closing, simply toggle the view state
        if (tree.isExpanded(node)) {
            tree.collapse(node);
            return;
        }

        // if data is already populated, don't execute secondary redundant API trips
        if (node.children && node.children.length > 0) {
            tree.expand(node);
            return;
        }

        // set loading indicator
        node.isLoading = true;

        // make API call using the parent node's key
        this.api.getStructureTreeChildNodes(
            this.owner, 
            this.repository, 
            this.branch,
            node.key
        ).subscribe({
            next: (data) => {
                node.children = this.convertToNodes(data);
                node.isLoading = false;

                // trigger immutable array update so MatTree redraws elements
                this.dataSource.update(currentData => [...currentData]);

                // animate opening state now that structural nodes exist in memory
                tree.expand(node);
            },
            error: () => {
                node.isLoading = false;
            }
        });
    }    

    private currentOwner?: string;
    private currentRepository?: string;
    private currentBranch?: string;

    override async refreshData() {
        if (
            this.owner !== this.currentOwner 
            || this.repository !== this.currentRepository 
            || this.branch !== this.currentBranch
        ) {
            this.currentOwner = this.owner;
            this.currentRepository = this.repository;
            this.currentBranch = this.branch;
            
            this.refreshRootNodes();
        }

        // // get route and expand
        // if (this.key?.length ?? 0 > 0) {
        //     if (!this.isLastInCurrentRoute(this.key)) {
        //         this.currentRoute = this.api.getRoute(this.key);
        //         this.nodesToExpand = [...this.currentRoute];

        //         this.openRoute();
        //     }
        // } else {
        //     this.currentRoute = [];
        // }
    }

    // refreshTree(p: any) {
    //     this.dataSource.data = p.map(x => new StructureTreeNode(x.key, x.containerKey,  x.name, x.description, 0, true, x.isFolder));

    //     this.openRoute();
    // }

    // openRoute() {
    //     if (!this.dataSource.data || !this.treeControl.dataNodes || !this.nodesToExpand) {
    //         return;
    //     }
    //     if (!(this.nodesToExpand.length > 0)) {
    //         return;
    //     }

    //     const entity = this.nodesToExpand[0];
    //     const node = this.treeControl.dataNodes.find(x => x.key === entity.key && !x?.isLoading);
    //     if (node) {
    //         // remove node from list
    //         this.nodesToExpand = this.nodesToExpand.filter(x => !(x.key === node.key));
    //         // expand
    //         if (!this.treeControl.isExpanded(node)) {
    //             this.treeControl.expand(node);
    //         } else if (this.nodesToExpand.length > 0) {
    //             this.openRoute();
    //         }

    //         // scroll to selected node
    //         if (this.nodesToExpand.length === 0) {
    //             this.showSelectedNode();
    //         }
    //     } else if (!(entity.containerKey?.length ?? 0 > 0)) { // root node was not found
    //         this.refreshRootNodes();
    //     } else { // try to find parent node and reopen it
    //         const parentNode = this.treeControl.dataNodes.find(x =>
    //             x.key === entity.containerKey && !x?.isLoading);
    //         if (parentNode && this.treeControl.isExpanded(parentNode)) {
    //             this.treeControl.collapse(parentNode);
    //             //this.treeControl.expand(parentNode);
    //         }
    //     }
    // }

    // expandFromRoute(nodes: StructureTreeNode[]) {
    //     if (!nodes || !this.nodesToExpand) {
    //         return;
    //     }

    //     nodes.forEach(node => {
    //         const current = this.nodesToExpand.find(x => x.key === node.key);
    //         if (current) {
    //             // expand if not expanded and not last
    //             if (this.nodesToExpand[this.nodesToExpand.length - 1] !== current) {
    //                 if (this.treeControl.isExpanded(node)) {
    //                     this.expandFromRoute(this.treeControl.getDescendants(node));
    //                 }
    //                 else {
    //                     this.treeControl.expand(node);
    //                 }
    //             }
    //             // remove node from list
    //             this.nodesToExpand = this.nodesToExpand.filter(x => !(x.key === node.key));
    //             // show node
    //             if (this.nodesToExpand.length === 0) {
    //                 this.showSelectedNode();
    //             }
    //         }
    //     });
    // }

    // showSelectedNode() {
    //     setTimeout(() => {
    //         const element = document.querySelector('.node-active');
    //         if (element) {
    //             element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    //         }
    //     }, 50);
    // }

    // isShowBreadcrumb() {
    //     if (!this.currentRoute) {
    //         return false;
    //     }

    //     return this.currentRoute.length > 0;
    // }

    // isLastInCurrentRoute(key: string) {
    //     if (!this.currentRoute) {
    //         return false;
    //     }

    //     return this.currentRoute[this.currentRoute.length - 1]?.key === key;
    // }
}
