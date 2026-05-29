import { CollectionViewer, DataSource, SelectionChange } from "@angular/cdk/collections";
import { FlatTreeControl } from "@angular/cdk/tree";
import { BehaviorSubject, merge, Observable } from "rxjs";
import { map } from "rxjs/operators";

import { StructureApiService } from  "@/app/knowledge/api-services/structure-api.service";

import { StructureTreeNode } from "./structure-tree-node";

export class StructureTreeDataSource implements DataSource<StructureTreeNode> {

    dataChange = new BehaviorSubject<StructureTreeNode[]>([]);

    get data(): StructureTreeNode[] { return this.dataChange.value; }
    set data(value: StructureTreeNode[]) {
        this._treeControl.dataNodes = value;
        this.dataChange.next(value);
    }

    constructor(
        private _treeControl: FlatTreeControl<StructureTreeNode>,
        private api: StructureApiService
    ) { }

    connect(collectionViewer: CollectionViewer): Observable<StructureTreeNode[]> {
        this._treeControl.expansionModel.changed.subscribe(change => {
            if ((change as SelectionChange<StructureTreeNode>).added ||
                (change as SelectionChange<StructureTreeNode>).removed) {
                this.handleTreeControl(change as SelectionChange<StructureTreeNode>);
            }
        });

        return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => this.data));
    }

    disconnect(collectionViewer: CollectionViewer): void { }

    /** Handle expand/collapse behaviors */
    handleTreeControl(change: SelectionChange<StructureTreeNode>) {
        if (change.added) {
            change.added.forEach(node => this.toggleNode(node, true));
        }
        if (change.removed) {
            change.removed.slice().reverse().forEach(node => this.toggleNode(node, false));
        }
    }

    /**
     * Toggle the node, remove from display list
     */
    private _children: StructureTreeNode[] = [];
    private _node = null;
    private _expand = null;

    get children(): StructureTreeNode[] { return this._children; }
    set children(value: StructureTreeNode[]) {
        this._children = value;
        const index = this.data.indexOf(this._node);
        if (!this._children || index < 0) { // If no children, or cannot find the node, no op
            return;
        }

        this._node.isLoading = true;

        setTimeout(() => {
            if (this._expand) {
                const nodes = this._children.map(x =>
                    new StructureTreeNode(x.key, x.containerKey, x.name, x.description, this._node.level + 1, true));
                this.data.splice(index + 1, 0, ...nodes);
            } else {
                let count = 0;
                for (let i = index + 1; i < this.data.length
                    && this.data[i].level > this._node.level; i++, count++) { }
                this.data.splice(index + 1, count);
            }

            // finish loading
            this._node.isLoading = false;

            // notify the change
            this.dataChange.next(this.data);
        }, 200);
    }

    toggleNode(node: StructureTreeNode, expand: boolean) {
        this.children = this.api.getStructureTreeNodes(node.key);
        // this.api.getStructureTreeNodes(node.key).subscribe(
        //     (p: any) => { this.children = p.data; }
        // );
        this._node = node;
        this._expand = expand;
    }
}
