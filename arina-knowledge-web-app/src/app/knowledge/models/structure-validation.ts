import { StructureValidationResult } from '../constants/structure-validation-result';

export interface StructureValidation {
    ruleId: string;
    result: StructureValidationResult;
    message: string;
    suggestion?: string;
    /** One-based source row, or the suggested insertion row for missing content. */
    row: number;
}

export interface StructureValidationContext {
    source: string;
    lines: readonly string[];
    entityType?: string;
    entityName?: string;
}

export interface StructureValidationRule {
    id: string;
    /** Omit to apply the rule to every Markdown file. */
    entityTypes?: readonly string[];
    validate(context: StructureValidationContext): readonly StructureValidation[];
}
