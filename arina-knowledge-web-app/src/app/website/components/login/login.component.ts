import { Component, inject } from '@angular/core';

import { AuthorizationService } from '@/app/core/services/authorization.service';
import { StructureApiService } from '@/app/knowledge/api-services/structure-api.service';

@Component({
  templateUrl: './login.component.html'
})

export class LoginComponent {
    protected authorizationService = inject(AuthorizationService);
    private structureService = inject(StructureApiService);

    public repos: any[] = [];

    public loadRepos() {
        this.structureService.getRepositories().subscribe({
            next: (data) => {
                this.repos = data;
            },
            error: (err) => {
                console.error('Error fetching repositories:', err);
            }
        });
    }
}
