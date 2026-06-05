import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';

import { StructureDesignerComponent } from '../../../knowledge/components/structure-designer/structure-designer.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, StructureDesignerComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent {
    protected authorizationService = inject(AuthorizationService);
    protected routes = inject(AppRoutes)
}
