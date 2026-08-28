import { Component, effect, inject, input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AppRoutes } from '@/app/core/constants/app-routes';

@Component({
    selector: 'app-github-setup',
    templateUrl: './github-setup.component.html'
})
export class GithubSetupComponent {
    private http = inject(HttpClient);
    private router = inject(Router);
    protected routes = inject(AppRoutes)

    public installation_id = input<string | null>(null);

    constructor() {
        effect(async () => {
            const currentId = this.installation_id();

            if (!currentId) {
                return; // wait until the router binds the query param value
            }

            const installationId = parseInt(currentId, 10);

            try {
                await firstValueFrom(
                    this.http.post(this.routes.backendGitHubCompleteInstallation, 
                        { installationId }, 
                        {
                            withCredentials: true 
                        }
                    )
                );

                this.router.navigate([this.routes.knowledge]);
            } catch (error) {
                console.error('Failed to sync installation with backend:', error);
                this.router.navigate(['/error']);
            }
        });
    }
}