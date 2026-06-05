import { Component, inject } from '@angular/core';

import { AuthorizationService } from '@/app/core/services/authorization.service';

@Component({
  templateUrl: './logout.component.html'
})

export class LogoutComponent {
    private authorizationService = inject(AuthorizationService);

    constructor() {
        this.authorizationService.clearToken();
    }
}
