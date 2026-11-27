import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StructureValidation } from '../models/validation/structure-validation';
import { StructureValidationContext } from '../models/validation/structure-validation-context';
import { StructurePath } from '../models/validation/structure-path';
import { StructureValidationRule } from '../models/validation/structure-validation-rule';
import { parseStructureFirstLine } from '../utils/parse-structure-first-line';
import { StructureApiService } from './structure-api.service';
import { structureDescriptionRule } from './validation-rules/structure-description-rule';
import { structureLinkRule } from './validation-rules/structure-link-rule';
import { structureNameRule } from './validation-rules/structure-name-rule';

/** Optional override for the service's default rules. */
export const STRUCTURE_VALIDATION_RULES = new InjectionToken<readonly StructureValidationRule[]>(
    'Structure validation rules'
);

@Injectable({ providedIn: 'root' })
export class StructureValidationService {
    private readonly rules = inject(STRUCTURE_VALIDATION_RULES, { optional: true }) ?? [
        structureNameRule,
        structureDescriptionRule,
        structureLinkRule
    ];
    private readonly api = inject(StructureApiService);

    async validate(markdown: string, repository?: StructurePath): Promise<StructureValidation[]> {
        const source = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        const lines = source.split('\n');
        const { structureType, structureName } = parseStructureFirstLine(lines[0]);
        const checks = new Map<string, Promise<boolean>>();
        const context: StructureValidationContext = {
            source, 
            lines, 
            structureType, 
            structureName, 
            repository,
            structureExists: repository ? path => {
                let check = checks.get(path);
                if (!check) {
                    check = firstValueFrom(this.api.isStructureExists(
                        repository.owner, 
                        repository.repository, 
                        repository.branch, 
                        path
                    ));
                    checks.set(path, check);
                }
                return check;
            } : undefined
        };

        const results = await Promise.all(this.rules
            .filter(rule => !rule.structureTypes || (!!structureType && rule.structureTypes.includes(structureType)))
            .map(rule => rule.validate(context)));
        return results.flat();
    }
}
