import { StructureValidation } from './structure-validation';
import { StructureValidationContext } from './structure-validation-context';

/** A check that can return zero or more results for a Markdown document, optionally limited to specific structure types. */
export interface StructureValidationRule {
    id: string;
    /** Omit to apply the rule to every Markdown file. */
    structureTypes?: readonly string[];
    validate(context: StructureValidationContext): readonly StructureValidation[] | Promise<readonly StructureValidation[]>;
}
