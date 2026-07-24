import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

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
        const headers =  this.getHeaders(true);

        return this.http.get(`${this.routes.githubApiUserInfo}`, { headers });
    }

    getRepositories(): Observable<any> {
        const headers =  this.getHeaders(true);

        return this.http.get(`${this.routes.githubApi}/user/repos`, { headers });
    }

    getBranches(
        ownerName: string | undefined,
        repositoryName: string | undefined
    ): Observable<any> {
        if (!ownerName || !repositoryName) {
            return of([]);
        }

        const headers =  this.getHeaders()

        return this.http.get(`${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiBranches}`, { headers });
    }

    getStructureTreeRootNodes(
        ownerName: string | undefined,
        repositoryName: string | undefined,
        branchName: string | undefined
    ): Observable<any> {
        // console.log('Fetching Structure Tree Root Nodes with params:', { ownerName, repositoryName, branchName });

        if (!ownerName || !repositoryName || !branchName) {
            return of([]);
        }

        const headers =  this.getHeaders()

        return this.http.get(`${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiContents}/?ref=${branchName}`, { headers });
    }

    getStructureTreeChildNodes(
        ownerName: string | undefined,
        repositoryName: string | undefined,
        branchName: string | undefined,
        containerKey: string | undefined,
    ): Observable<any> {
        if (!ownerName || !repositoryName || !branchName || !containerKey) {
            return of([]);
        }
        
        const headers =  this.getHeaders()

        return this.http.get(`${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiContents}/${containerKey}?ref=${branchName}`, { headers });
    }

    getStructureRaw(
        ownerName: string | undefined,
        repositoryName: string | undefined,
        branchName: string | undefined,
        key: string | undefined
    ): Observable<any> {
        // console.log('Fetching Raw Structure with params: ', { ownerName, repositoryName, branchName, key });

        if (!ownerName || !repositoryName || !branchName) {
            return of('');
        }

        const url = key ? 
            `${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiContents}/${key}?ref=${branchName}` : 
            `${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiContents}/?ref=${branchName}`;

        const headers =  this.getHeaders()
        return this.http.get(url, { headers });
    }
}