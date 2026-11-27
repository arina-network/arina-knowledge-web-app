/** Outcome of a validation check, from a pass to an error, warning, or suggestion. */
export enum StructureValidationResult {
    Ok = 'ok',
    Error = 'error',
    Warning = 'warning',
    Suggestion = 'suggestion'
}
