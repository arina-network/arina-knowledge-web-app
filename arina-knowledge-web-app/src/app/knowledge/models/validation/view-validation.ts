import { StructureValidation } from './structure-validation';

/** A validation result with an optional file path for navigation from folder results. */
export interface ViewValidation extends StructureValidation {
    filePath?: string;
}
