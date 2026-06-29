import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';

import { RepositoryCategory } from '@/app/knowledge/constants/repository-category';
import { RepositoryManagerComponent } from '@/app/knowledge/components/repository-manager/repository-manager.component';

@Component({
  selector: 'app-settings',
  imports: [
    RouterLink,
    RepositoryManagerComponent
  ],
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
    protected readonly repositoryCategory = RepositoryCategory;   
    protected authorizationService = inject(AuthorizationService);
    protected routes = inject(AppRoutes)
}
