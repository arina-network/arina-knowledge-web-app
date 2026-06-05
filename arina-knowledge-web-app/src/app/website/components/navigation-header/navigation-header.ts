import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu'; // Import the module
import { MatIconModule } from '@angular/material/icon';

import { AuthorizationService } from '@/app/core/services/authorization.service';

import { AppRoutes } from '../../../core/constants/app-routes';
import { Repository } from '../../../knowledge/models/repository';


@Component({
  selector: 'app-navigation-header',
  imports: [
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    RouterLink
  ],
  templateUrl: './navigation-header.html'
})
export class NavigationHeader {
    protected authorizationService = inject(AuthorizationService);
    protected routes = inject(AppRoutes);
    protected currentRepository?: Repository;

    get repositories() : Repository[] {
      return [
        {
          url: 'https://github.com/arina-network/arina-knowledge',
          name: 'Arina Knowledge'
        },
        {
          url: 'https://github.com/arina-network/arina-knowledge-guide',
          name: 'Arina Knowledge Guide'
        }
      ];
    }

    get repositoryName() {
      return this.currentRepository ? this.currentRepository.name : 'Select Repository';
    }      

    setRepository(repository: Repository) {
      this.currentRepository = repository;
    }
    
    isExpanded = false;

    collapse() {
        this.isExpanded = false;
    }

    toggle() {
        this.isExpanded = !this.isExpanded;
    }    
}
