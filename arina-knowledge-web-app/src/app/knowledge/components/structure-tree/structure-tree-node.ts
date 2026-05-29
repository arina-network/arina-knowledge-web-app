import { StructureIcons } from "../../functions/structure-icons";

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
        return StructureIcons.getIconName(this);
    }
}