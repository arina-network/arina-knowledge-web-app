import { StructureInfo } from "./structure-info";

export class Structure implements StructureInfo {
    key?: string;
    containerKey?: string;
    name?: string;
    description?: string;
    isFolder : boolean = false;
    isReadme : boolean = false;

    source?: string;

    parts: Structure[] = [];
}
