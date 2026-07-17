export interface StructureLink {
    name: string;
    url: string;
    isFolder : boolean;

    owner?: string;
    repository?: string;
    branch?: string;
    key?: string;
}
