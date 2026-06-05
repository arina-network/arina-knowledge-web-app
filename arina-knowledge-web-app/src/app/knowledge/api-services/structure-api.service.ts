import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';


@Injectable({
  providedIn: 'root'
})
export class StructureApiService {
    private http = inject(HttpClient);
    private authorizationService = inject(AuthorizationService);
    private routes = inject(AppRoutes)

    getUserInfo(): Observable<any> {
        const token = this.authorizationService.getToken();
        if (!token) {
            throw new Error('No GitHub token provided.');
        }

        // Attach user's token to the Authorization header
        const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
        });

        return this.http.get(`${this.routes.githubApiUserInfo}`, { headers });
    }

    getRepositories(): Observable<any> {
        const token = this.authorizationService.getToken();
        if (!token) {
            throw new Error('No GitHub token provided.');
        }

        // Attach user's token to the Authorization header
        const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
        });

        return this.http.get(`${this.routes.githubApi}/user/repos`, { headers });
    }

    getStructureTreeRootNodes(): any {
        // fake data for testing
        return [
            {
                key: 'logic',
                name: 'logic',
                isFolder: true
            },
            {
                key: 'architecture',
                name: 'architecture',
                isFolder: true
            },
            {
                key: 'README.md',
                name: 'README.md'
            }
        ];
    }

    getStructureTreeNodes(containerKey: any): any {
        // fake data for testing
        if (containerKey === 'logic') {
            return [
                {
                    key: 'logic/core',
                    name: 'core',
                    isFolder: true
                },
                {
                    key: 'logic/knowledge',
                    name: 'knowledge',
                    isFolder: true
                },
                {
                    key: 'logic/README.md',
                    name: 'README.md'
                }
            ];
        } else if (containerKey === 'architecture') {
            return [
                {
                    key: 'architecture/api',
                    name: 'api',
                    isFolder: true
                },
                {
                    key: 'architecture/ui',
                    name: 'ui',
                    isFolder: true
                },
                {
                    key: 'architecture/README.md',
                    name: 'README.md'
                }
            ];
        } else {
            return [];
        }
    }

    getRoute(key: any): any {
        return [];
    }

    getStructure(key: any): any {
        return {
            key,
            name: 'TEST NAME for ' + key,
            source: 'TEST SOURCE for ' + key,
            isFolder: false
        }        
    }
}