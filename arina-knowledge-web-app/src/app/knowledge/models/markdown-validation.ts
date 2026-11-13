export type MarkdownValidationStatus = 'ok' | 'error' | 'warning' | 'suggestion';

export interface MarkdownValidationResult {
    ruleId: string;
    status: MarkdownValidationStatus;
    message: string;
    /** One-based source row, or the suggested insertion row for missing content. */
    row: number;
}

export interface MarkdownValidationContext {
    source: string;
    lines: readonly string[];
    entityType?: string;
    entityName?: string;
}

export interface MarkdownValidationRule {
    id: string;
    /** Omit to apply the rule to every Markdown file. */
    entityTypes?: readonly string[];
    validate(context: MarkdownValidationContext): readonly MarkdownValidationResult[];
}
