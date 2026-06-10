import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';

import { Repository } from '@/app/knowledge/models/repository';
import { RepositoryService } from '@/app/knowledge/services/repository.service';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    MatTooltipModule
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent {
    protected authorizationService = inject(AuthorizationService);
    protected repositoryService = inject(RepositoryService);
    protected routes = inject(AppRoutes)

    get repositories() : Repository[] {
      return this.repositoryService.getRepositories(); 
    }    
}
