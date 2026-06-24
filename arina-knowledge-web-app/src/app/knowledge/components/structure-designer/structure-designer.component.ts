import { Component, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router'; 

import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTree, MatTreeModule } from '@angular/material/tree'; 


import { AppRoutes } from '@/app/core/constants/app-routes';

import { NotificationService } from '@/app/core/services/notification.service';
import { BaseDataComponent } from '@/app/core/components/base-data/base-data.component';
import { ProgressComponent } from '@/app/core/components/progress/progress.component';

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
        MatDividerModule,
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

    protected notificationService = inject(NotificationService);        
    protected repositoryService = inject(RepositoryService);
    protected routes = inject(AppRoutes);

    protected api = inject(StructureApiService);

    dataSource = signal<StructureTreeNode[]>([]);
    readonly tree = viewChild<MatTree<StructureTreeNode>>('tree');

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
                this.isDataLoading = false;

                const rootNodes = this.convertToNodes(data)
                this.dataSource.set(rootNodes);
                
                this.expandNodeByKey(rootNodes);
            },
            error: (err) => {
                this.isDataLoading = false;

                this.notificationService.showError('Fetching data from GitHub failed: ' + err.message);
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

                this.expandNodeByKey(node.children);
            },
            error: (err) => {
                node.isLoading = false;

                this.notificationService.showError('Fetching data from GitHub failed: ' + err.message);
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

            this.repositoryService.setOwnerAndRepositoryAndBranch(
                this.owner,
                this.repository,
                this.branch
            );
        }
    }

    private expandNodeByKey(nodes: StructureTreeNode[]) {
        const treeInstance = this.tree();
        if (treeInstance && this.key) {
            const matchNode = this.findNodeInArray(nodes, this.key);
            if (matchNode) {
                if (this.hasChild(0, matchNode)) {
                    this.onNodeToggle(treeInstance, matchNode);
                    
                    this.cdr.detectChanges(); 
                }
            }
        }
    }

    private findNodeInArray(nodes: StructureTreeNode[], key: string): StructureTreeNode | undefined {
        return nodes.find(n => key.startsWith(n.key));
    }    
}
