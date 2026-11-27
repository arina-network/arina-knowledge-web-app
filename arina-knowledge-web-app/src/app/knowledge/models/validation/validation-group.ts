import { ViewValidation } from './view-validation';

/** The issues shown under one structure name in the validation panel. */
export interface ValidationGroup {
    path: string;
    name: string;
    issues: ViewValidation[];
}
