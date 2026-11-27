import { StructurePath } from './structure-path';

/** Markdown source, parsed title fields, and optional repository lookup available to a rule. */
export interface StructureValidationContext {
    source: string;
    lines: readonly string[];
    structureType?: string;
    structureName?: string;
    repository?: StructurePath;
    structureExists?: (path: string) => Promise<boolean>;
}
