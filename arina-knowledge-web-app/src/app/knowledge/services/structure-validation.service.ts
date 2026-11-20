import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StructureValidation, StructureValidationContext, StructureValidationRepository, StructureValidationRule } from '../models/structure-validation';
import { STRUCTURE_RULES } from '../validation/structure-rules';
import { StructureApiService } from './structure-api.service';

export const STRUCTURE_VALIDATION_RULES = new InjectionToken<readonly StructureValidationRule[]>(
    'Structure validation rules',
    { providedIn: 'root', factory: () => STRUCTURE_RULES }
);

@Injectable({ providedIn: 'root' })
export class StructureValidationService {
    private readonly rules = inject(STRUCTURE_VALIDATION_RULES);
    private readonly api = inject(StructureApiService);

    async validate(markdown: string, repository?: StructureValidationRepository): Promise<StructureValidation[]> {
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
        const checks = new Map<string, Promise<boolean>>();
        const context: StructureValidationContext = {
            source, lines, entityType, entityName, repository,
            structureExists: repository ? path => {
                let check = checks.get(path);
                if (!check) {
                    check = firstValueFrom(this.api.structureExists(
                        repository.owner, repository.repository, repository.branch, path
                    ));
                    checks.set(path, check);
                }
                return check;
            } : undefined
        };

        const results = await Promise.all(this.rules
            .filter(rule => !rule.entityTypes || (!!entityType && rule.entityTypes.includes(entityType)))
            .map(rule => rule.validate(context)));
        return results.flat();
    }
}
