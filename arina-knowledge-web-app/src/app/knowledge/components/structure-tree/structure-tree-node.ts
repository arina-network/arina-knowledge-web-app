// import { StructureIcons } from "../../functions/structure-icons";

export class StructureTreeNode {
    constructor(
        public key: string,
        public containerKey?: string,
        public name?: string,
        public description?: string,
        public level: number = 0,
        public expandable = false,
        public isFolder = false,
        public isLoading = false
    ) { }

    getIconName() {
        console.log('Getting icon name for node:', this);
        if (this.isFolder) {
            return 'folder';
        } else if (this.name?.toLowerCase().endsWith('.md')) {
            return 'description';
        } else if (this.name?.toLowerCase().endsWith('.svg')) {
            return 'schema';
        }

        return 'draft';
        // return StructureIcons.getIconName(this);
    }
}