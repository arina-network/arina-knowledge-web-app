import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthorizationService } from '../services/authorization.service';

@Injectable({
    providedIn: 'root'
})
export class GithubDataService {
    private http = inject(HttpClient);
    private authService = inject(AuthorizationService);
    private baseUrl = 'https://github.com';

    getRepositories(): Observable<any> {
        const token = this.authService.getToken();
        if (!token) {
            throw new Error('No GitHub token provided.');
        }

        // Attach user's token to the Authorization header
        const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
        });

        return this.http.get(`${this.baseUrl}/user/repos`, { headers });
    }
}