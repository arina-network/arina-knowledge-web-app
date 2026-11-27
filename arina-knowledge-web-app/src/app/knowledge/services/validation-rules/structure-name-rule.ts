import { StructureValidationResult } from '../../constants/structure-validation-result';
import { StructureValidation } from '../../models/validation/structure-validation';
import { StructureValidationRule } from '../../models/validation/structure-validation-rule';

/**
 * Requires row 1 to be a level-one heading with a lowercase structure type followed
 * by a name that starts with an uppercase letter. Reports each missing part as an error.
 */
export const structureNameRule: StructureValidationRule = {
    id: 'structure-name',
    validate({ structureType, structureName }) {
        const results: StructureValidation[] = [];

        if (!structureType) {
            results.push({
                ruleId: this.id, result: StructureValidationResult.Error, message: 'No Entity Type', row: 1,
                suggestion: 'Add a lowercase entity type after #.'
            });
        }
        if (!structureName) {
            results.push({
                ruleId: this.id, result: StructureValidationResult.Error, message: 'No Entity Name', row: 1,
                suggestion: 'Add an entity name starting with an uppercase letter.'
            });
        }

        return results.length ? results : [
            { ruleId: this.id, result: StructureValidationResult.Ok, message: 'Entity title is valid', row: 1 }
        ];
    }
};
