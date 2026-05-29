import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu'; // Import the module
import { MatIconModule } from '@angular/material/icon';

import { AppRoutes } from '../../constants/app-routes';
import { Repository } from '../../../knowledge/models/repository';

@Component({
  selector: 'app-navigation-header',
  imports: [
    MatIconModule,
    MatMenuModule,
    RouterLink
  ],
  templateUrl: './navigation-header.html'
})
export class NavigationHeader {
    protected readonly routes = new AppRoutes();
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
