import { StructureValidationResult } from '../../constants/structure-validation-result';

/** A rule's outcome at a source row, with a message and optional fix or link destination. */
export interface StructureValidation {
    ruleId: string;
    result: StructureValidationResult;
    message: string;
    suggestion?: string;
    url?: string;
    /** One-based source row, or the suggested insertion row for missing content. */
    row: number;
}
