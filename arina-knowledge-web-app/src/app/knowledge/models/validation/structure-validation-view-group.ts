import { StructureValidationView } from './structure-validation-view';

/** The issues shown under one structure name in the validation panel. */
export interface StructureValidationViewGroup {
    path: string;
    name: string;
    issues: StructureValidationView[];
}
