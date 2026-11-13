import { inject, Injectable, InjectionToken } from '@angular/core';

import { StructureValidation, StructureValidationContext, StructureValidationRule } from '../models/structure-validation';
import { STRUCTURE_RULES } from '../validation/structure-rules';

export const STRUCTURE_VALIDATION_RULES = new InjectionToken<readonly StructureValidationRule[]>(
    'Structure validation rules',
    { providedIn: 'root', factory: () => STRUCTURE_RULES }
);

@Injectable({ providedIn: 'root' })
export class StructureValidationService {
    private readonly rules = inject(STRUCTURE_VALIDATION_RULES);

    validate(markdown: string): StructureValidation[] {
        const source = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        const lines = source.split('\n');
        const title = /^#[ \t]+(.*)$/.exec(lines[0])?.[1]
            .replace(/[ \t]+#+[ \t]*$/, '').trim() ?? '';
        const words = title ? title.split(/\s+/) : [];
        const nameIndex = words.findIndex(word => /^\p{Lu}/u.test(word));
        const typeWords = nameIndex < 0 ? words : words.slice(0, nameIndex);
        const entityType = typeWords.length && typeWords.every(word =>
            /^\p{Ll}[\p{Ll}\p{M}\p{N}'’-]*$/u.test(word)
        ) ? typeWords.join(' ') : undefined;
        const entityName = nameIndex < 0 ? undefined : words.slice(nameIndex).join(' ');
        const context: StructureValidationContext = { source, lines, entityType, entityName };

        return this.rules
            .filter(rule => !rule.entityTypes || (!!entityType && rule.entityTypes.includes(entityType)))
            .flatMap(rule => rule.validate(context));
    }
}
