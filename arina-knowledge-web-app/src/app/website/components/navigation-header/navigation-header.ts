import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu'; // Import the module
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthorizationService } from '@/app/core/services/authorization.service';
import { RepositoryService } from '@/app/knowledge/services/repository.service';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { Branch } from '@/app/knowledge/models/branch';
import { Repository } from '@/app/knowledge/models/repository';

@Component({
  selector: 'app-navigation-header',
  imports: [
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    RouterLink
  ],
  templateUrl: './navigation-header.html'
})
export class NavigationHeader {
    protected authorizationService = inject(AuthorizationService);
    protected repositoryService = inject(RepositoryService);
    protected routes = inject(AppRoutes);

    get repositories() : Repository[] {
      return this.repositoryService.getRepositories(); 
    }

    get repositoryName() {
      return this.repositoryService.getSelectedRepository()?.name || 'Select Repository';
    }

    setRepository(repository: Repository) {
      this.repositoryService.setSelectedRepository(repository);
    }

    get branches() : Branch[] {
      return this.repositoryService.getBranches(); 
    }

    get branchName() {
      return this.repositoryService.getSelectedBranch()?.name || 'Select Branch';
    }

    setBranch(branch: Branch) {
      this.repositoryService.setSelectedBranch(branch);
    }
    
    isExpanded = false;

    collapse() {
        this.isExpanded = false;
    }

    toggle() {
        this.isExpanded = !this.isExpanded;
    }    
}
