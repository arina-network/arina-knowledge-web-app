export class StructureIcons {

    public static getIconName(structure: any): string | null {
        if (!structure) {
            return null;
        }

        if (structure.isFolder) {
            return 'folder_open';
        }

        return 'subject';
    }
}
