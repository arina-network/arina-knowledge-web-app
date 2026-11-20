import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StructureValidation, StructureValidationContext, StructureValidationRepository, StructureValidationRule } from '../models/structure-validation';
import { STRUCTURE_RULES } from '../validation/structure-rules';
import { parseStructureTitle } from '../validation/structure-title';
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
        const { entityType, entityName } = parseStructureTitle(lines[0]);
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
