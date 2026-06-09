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

    private getHeaders(throwError: boolean = false): HttpHeaders {
        const token = this.authorizationService.getToken();
        if (!token && throwError) {
            throw new Error('No GitHub token provided.');
        }

        return  token ?
            new HttpHeaders({
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json'
            }) : 
            new HttpHeaders({
                Accept: 'application/vnd.github.v3+json'
            });        
    }

    getUserInfo(): Observable<any> {
        // const token = this.authorizationService.getToken();
        // if (!token) {
        //     throw new Error('No GitHub token provided.');
        // }

        // // Attach user's token to the Authorization header
        // const headers = new HttpHeaders({
        //     Authorization: `Bearer ${token}`,
        //     Accept: 'application/vnd.github.v3+json'
        // });
        const headers =  this.getHeaders(true);

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

    getStructureTreeRootNodes(): Observable<any> {
        const headers =  this.getHeaders()

        return this.http.get(`${this.routes.githubApiRepositories}/arina-network/arina-knowledge/${this.routes.githubApiContents}`, { headers });

    }

    getStructureRaw(key: string | undefined = 'README.md'): Observable<any> {
        const headers =  this.getHeaders()

        // return this.http.get(`${this.routes.githubRaw}/arina-network/arina-knowledge/main/${key}`, { headers });
        return this.http.get(`${this.routes.githubApiRepositories}/arina-network/arina-knowledge/${this.routes.githubApiContents}/${key}/?ref=main`, { headers });
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