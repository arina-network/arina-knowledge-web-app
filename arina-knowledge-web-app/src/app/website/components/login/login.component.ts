import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';

import { AuthorizationService } from '@/app/core/services/authorization.service';
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
    protected authorizationService = inject(AuthorizationService);
    private structureService = inject(StructureApiService);

    protected login(userToken: string) {
        this.authorizationService.setToken(userToken);

        this.structureService.getUserInfo().subscribe({
            next: (data) => {
                this.authorizationService.setUserInfo(data);
            },
            error: (err) => {
                console.error('Error fetching User Info from GitHub:', err);
            }
        });
    }

    protected repos: any[] = [];

    protected loadRepos() {
        this.structureService.getRepositories().subscribe({
            next: (data) => {
                this.repos = data;
            },
            error: (err) => {
                console.error('Error fetching repositories:', err);
            }
        });
    }
}
