import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';
import { NotificationService } from '@/app/core/services/notification.service';

import { StructureApiService } from '@/app/knowledge/api-services/structure-api.service';

@Component({
  templateUrl: './login.component.html',
  imports: [
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ]  
})

export class LoginComponent {
    protected router = inject(Router);

    protected notificationService = inject(NotificationService);        
    protected authorizationService = inject(AuthorizationService);
    protected routes = inject(AppRoutes)
    
    protected structureService = inject(StructureApiService);

    protected login(userToken: string) {
        this.authorizationService.setToken(userToken);

        this.structureService.getUserInfo().subscribe({
            next: (data) => {
                this.authorizationService.setUserInfo(data);
                this.router.navigate([this.routes.knowledge]);
            },
            error: (err) => {
                this.authorizationService.logout();
                this.notificationService.showError('Fetching User Info from GitHub failed: ' + err.message);
            }
        });
    }

    // protected repos: any[] = [];

    // protected loadRepos() {
    //     this.structureService.getRepositories().subscribe({
    //         next: (data) => {
    //             this.repos = data;
    //         },
    //         error: (err) => {
    //             console.error('Error fetching repositories:', err);
    //         }
    //     });
    // }
}
