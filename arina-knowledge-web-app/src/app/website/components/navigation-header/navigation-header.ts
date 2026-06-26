import { Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu'; // Import the module
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';

import { Branch } from '@/app/knowledge/models/branch';
import { Repository } from '@/app/knowledge/models/repository';
import { RepositoryGroup } from '@/app/knowledge/models/repository-group';
import { RepositoryService } from '@/app/knowledge/services/repository.service';


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
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected authorizationService = inject(AuthorizationService);
  protected repositoryService = inject(RepositoryService);
  protected routes = inject(AppRoutes);

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed() // Auto-unsubscribes
    ).subscribe(() => {
      const params = this.getDeepestRouteParams(this.route.root);      
      this.refreshHeaderData(params);
    });
  }
  
  private getDeepestRouteParams(route: ActivatedRoute): Record<string, string> {
    let currentRoute = route;
    let combinedParams: Record<string, string> = { ...currentRoute.snapshot.params };

    // Traverse down to the deepest nested active route inside the router-outlet
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
      combinedParams = { ...combinedParams, ...currentRoute.snapshot.params };
    }

    return combinedParams;
  }

  private refreshHeaderData(params: Record<string, string>): void {
    if (!params["owner"] || !params["repository"]) {
      this.repositoryService.clear()
    }
  }  
    
    get repositories() : RepositoryGroup[] {
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
