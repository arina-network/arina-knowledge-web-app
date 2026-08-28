import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, map, Observable, tap } from 'rxjs';

import { StructureApiService } from '@/app/knowledge/services/structure-api.service';

import { AppAuthorization } from '../constants/app-authorization';
import { AppRoutes } from '../constants/app-routes';
import { UserInfo } from '../models/user-info';
import { NotificationService } from './notification.service';

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
    public repositories = signal<any[]>([]);

    getToken(): string | null {
        return this.userToken();
    }

    setToken(token: string): void {
        this.clearToken();

        this.userAuthorization.set(AppAuthorization.GitHubPAT);
        this.userToken.set(token.trim());
        this.userInfo.set(null);
    }

    clearToken(): void {
        this.userAuthorization.set(AppAuthorization.NoAuthorization);
        this.userToken.set(null);
        this.userInfo.set(null);
    }

    getUserInfo(): UserInfo | null {
        return this.userInfo();
    }

    setUserInfo(userInfo: UserInfo): void {
        this.userInfo.set(userInfo);
    }

    getRepositories(): any[] {
        return this.repositories();
    }

    loginToGitHub(domain: string): void {
        this.clearToken();

        this.userAuthorization.set(AppAuthorization.GitHubLogin);

        const secureDomain = domain.replace('http://', 'https://');

        window.location.href = `${this.routes.backendGitHubLogin}?returnUrl=${encodeURIComponent(secureDomain + '/#' + this.routes.knowledge)}`;

        // window.location.href = `${this.routes.backendGitHubLogin}?returnUrl=${encodeURIComponent(domain + '/#' + this.routes.knowledge)}`;
    }
    
    async checkGitHubToken(): Promise<void> {
        console.log('Current user authorization:', this.userAuthorization());
        try {
            const token = await firstValueFrom(this.githubFetchTokenFromBackend());

            console.log('Fetched GitHub token from backend:', token);

            const headers = new HttpHeaders({
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json'
            })             
            const data = await firstValueFrom(this.http.get(`${this.routes.githubApiUserInfo}`, { headers }));
            console.log('Fetched user info from GitHub:', data);
            this.setUserInfo(data as UserInfo);
        } catch (error) {
            // No session found or token expired, leave signals as null (logged out)
            console.log('No active GitHub session found on boot.');
        }        
    }

    logout(): void {
        if (this.userAuthorization() === AppAuthorization.GitHubLogin) {
            this.githubLogout().subscribe({
                next: () => {
                    this.clearToken();
                },
                error: (err) => {
                    this.notificationService.showError('Logout from GitHub failed: ' + err.message);
                }
            });
        } else {
            this.clearToken();
        }
    }

    isAuthorized(): boolean {
        return this.userAuthorization() !== AppAuthorization.NoAuthorization;
    }

    githubFetchTokenFromBackend(): Observable<string> {
        // FIX: Explicitly set Authorization to an empty string or delete it.
        // This overrides any global HTTP behavior that is trying to inject "Bearer null".
        // const headers = new HttpHeaders().set('Authorization', '');

        return this.http.get<{ accessToken: string }>(
            this.routes.backendGitHubToken, 
            {
                // headers: headers,
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

    async githubInstallation(installationId: string | unknown): Promise<void> {
        // 1. First, check if the URL contains an installation_id query parameter.
        // GitHub appends this automatically when bouncing the user back to your Setup URL.
        // const installationId = this.route.snapshot.queryParamMap.get('installation_id');
        
        if (installationId) {
            // Optional: You can send this ID to your backend to save it instantly,
            // or let your webhook/status check handle it.
            console.log('User returned from GitHub with Installation ID:', installationId);
        }

        // 2. Fetch the repositories from your .NET backend
        try {
            const repos = await firstValueFrom(
                this.http.get<any[]>(
                    this.routes.backendGitHubInstallation, 
                    { 
                        withCredentials: true 
                    }
                )
            );
            this.repositories.set(repos);
        } catch (error: any) {
            if (error.status === 400 && error.error?.error === 'InstallationRequired') {
                // if the backend says no repos are linked, redirect them to select private repos
                window.location.href = this.routes.backendGitHubAppInstallation;
            } else {
                console.error('An error occurred loading repositories:', error);
            }
        }
    }

    githubLogout(): Observable<any> {
        return this.http.post(
            this.routes.backendGitHubLogout, 
            {}, 
            { withCredentials: true } // Crucial: Ensures the browser sends the cookie so .NET can destroy it
        );
        // ).pipe(
        //     tap(() => {
        //         // 1. Wipe the GitHub token from Angular's in-memory storage immediately
        //         // this.tokenSubject.next(null);
            
        //         // 2. Redirect the user back to your public landing or login page
        //         // this.router.navigate(['/github-login']);
        //     })
        // );
    }    
}
