import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { AppAuthorization } from '../constants/app-authorization';
import { AppRoutes } from '../constants/app-routes';
import { UserInfo } from '../models/user-info';
import { NotificationService } from './notification.service';
import { map, Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthorizationService {
    protected http = inject(HttpClient);
        // private router: Router
    protected routes = inject(AppRoutes);

    protected notificationService = inject(NotificationService);        

    // store token strictly in-memory (wipes out on page refresh)
    private userAuthorization = signal<AppAuthorization>(AppAuthorization.NoAuthorization);
    private userToken = signal<string | null>(null);
    private userInfo = signal<UserInfo | null>(null);

    getToken(): string | null {
        return this.userToken();
    }

    setToken(token: string): void {
        this.userToken.set(token.trim());
        this.userInfo.set(null);
    }

    getUserInfo(): UserInfo | null {
        return this.userInfo();
    }

    setUserInfo(userInfo: UserInfo): void {
        this.userInfo.set(userInfo);
    }

    logout(): void {
        if (this.userAuthorization() === AppAuthorization.GitHubLogin) {
            this.githubLogout().subscribe({
                next: () => {
                    this.userAuthorization.set(AppAuthorization.NoAuthorization);
                    this.userToken.set(null);
                    this.userInfo.set(null);
                },
                error: (err) => {
                    this.notificationService.showError('Logout from GitHub failed: ' + err.message);
                }
            });
        } else {
            this.userAuthorization.set(AppAuthorization.NoAuthorization);
            this.userToken.set(null);
            this.userInfo.set(null);
        }
    }

    isAuthorized(): boolean {
        return this.userToken() !== null || this.userAuthorization() !== AppAuthorization.NoAuthorization;
    }

    githubFetchTokenFromBackend(): Observable<string> {
        // FIX: Explicitly set Authorization to an empty string or delete it.
        // This overrides any global HTTP behavior that is trying to inject "Bearer null".
        const headers = new HttpHeaders().set('Authorization', '');

        return this.http.get<{ accessToken: string }>(
            this.routes.backendGitHubToken, 
            {
                headers: headers,
                withCredentials: true // Crucial to send the .NET session cookie
            }
        ).pipe(
            map(res => res.accessToken),
            tap(token => {
                this.userAuthorization.set(AppAuthorization.GitHubLogin);
                this.userToken.set(token);
                this.userInfo.set(null);
            })
        );
    }
    
    githubLogout(): Observable<any> {
        return this.http.post(
            this.routes.backendGitHubLogout, 
            {}, 
            { withCredentials: true } // Crucial: Ensures the browser sends the cookie so .NET can destroy it
        ).pipe(
            tap(() => {
                // 1. Wipe the GitHub token from Angular's in-memory storage immediately
                // this.tokenSubject.next(null);
            
                // 2. Redirect the user back to your public landing or login page
                // this.router.navigate(['/github-login']);
            })
        );
    }    
}
