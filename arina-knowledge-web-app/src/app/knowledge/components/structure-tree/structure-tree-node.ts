export class StructureTreeNode {
    constructor(
        public key: string,
        public containerKey?: string,
        public name?: string,
        public description?: string,

        public level: number = 0,
        public isFolder = false,
        public expandable = false,

        public children?: StructureTreeNode[],
        public isLoading = false
    ) { }

    getIconName() {
        if (this.isFolder) {
            return 'folder';
        } else if (this.name?.toLowerCase().endsWith('.md')) {
            return 'description';
        } else if (this.name?.toLowerCase().endsWith('.svg')) {
            return 'schema';
        }

        return 'draft';
    }
}