import { Component, inject } from "@angular/core";
import { RouterLink } from '@angular/router';

import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutes } from '@/app/core/constants/app-routes';

// import { Repository } from '@/app/knowledge/models/repository';
import { RepositoryGroup } from "../../models/repository-group";
import { RepositoryService } from '@/app/knowledge/services/repository.service';


@Component({
    selector: 'app-structure-home',
    imports: [
        RouterLink,
        MatTooltipModule
    ],    
    templateUrl: './structure-home.component.html'
})
export class StructureHomeComponent {
    protected repositoryService = inject(RepositoryService);
    protected routes = inject(AppRoutes)

    get repositories() : RepositoryGroup[] {
      return this.repositoryService.getRepositories(); 
    }    
}
