import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';

import { RepositoryService } from '@/app/knowledge/services/repository.service';

@Component({
  templateUrl: './logout.component.html'
})

export class LogoutComponent {
    protected router = inject(Router);

    protected authorizationService = inject(AuthorizationService);
    protected routes = inject(AppRoutes)

    protected repositoryService = inject(RepositoryService);

    constructor() {
        this.repositoryService.clear();
        this.authorizationService.logout();
        this.router.navigate([this.routes.knowledge]);
    }
}
