import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';

@Component({
  selector: 'app-settings',
  imports: [
    RouterLink
  ],
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
    protected authorizationService = inject(AuthorizationService);
    protected routes = inject(AppRoutes)
}
