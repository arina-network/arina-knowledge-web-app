import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { AppRoutes } from '@/app/core/constants/app-routes';
import { AuthorizationService } from '@/app/core/services/authorization.service';

import { RepositoryService } from '../services/repository.service';

@Injectable({
  providedIn: 'root'
})
export class StructureApiService {
    private http = inject(HttpClient);
    private authorizationService = inject(AuthorizationService);
    private repositoryService = inject(RepositoryService);
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

    getStructureTreeRootNodes(
        ownerName: string | undefined = this.repositoryService.getSelectedRepository()?.ownerName,
        repositoryName: string | undefined = this.repositoryService.getSelectedRepository()?.repositoryName,
        branchName: string | undefined = this.repositoryService.getSelectedBranch()?.name ?? 'main'
    ): Observable<any> {
        if (!ownerName || !repositoryName || !branchName) {
            return of([]);
        }

        const headers =  this.getHeaders()

        return this.http.get(`${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiContents}/?ref=${branchName}`, { headers });
    }

    getStructureTreeChildNodes(
        ownerName: string | undefined = this.repositoryService.getSelectedRepository()?.ownerName,
        repositoryName: string | undefined = this.repositoryService.getSelectedRepository()?.repositoryName,
        branchName: string | undefined = this.repositoryService.getSelectedBranch()?.name ?? 'main',
        containerKey: any
    ): Observable<any> {
        if (!ownerName || !repositoryName || !branchName || !containerKey) {
            return of([]);
        }
        
        const headers =  this.getHeaders()

        return this.http.get(`${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiContents}/${containerKey}?ref=${branchName}`, { headers });
        // // fake data for testing
        // if (containerKey === 'logic') {
        //     return [
        //         {
        //             key: 'logic/core',
        //             name: 'core',
        //             isFolder: true
        //         },
        //         {
        //             key: 'logic/knowledge',
        //             name: 'knowledge',
        //             isFolder: true
        //         },
        //         {
        //             key: 'logic/README.md',
        //             name: 'README.md'
        //         }
        //     ];
        // } else if (containerKey === 'architecture') {
        //     return [
        //         {
        //             key: 'architecture/api',
        //             name: 'api',
        //             isFolder: true
        //         },
        //         {
        //             key: 'architecture/ui',
        //             name: 'ui',
        //             isFolder: true
        //         },
        //         {
        //             key: 'architecture/README.md',
        //             name: 'README.md'
        //         }
        //     ];
        // } else {
        //     return [];
        // }
    }

    getStructureRaw(
        ownerName: string | undefined = this.repositoryService.getSelectedRepository()?.ownerName,
        repositoryName: string | undefined = this.repositoryService.getSelectedRepository()?.repositoryName,
        branchName: string | undefined = this.repositoryService.getSelectedBranch()?.name ?? 'main',
        key: string | undefined = 'README.md'
    ): Observable<any> {
        console.log('Fetching Raw Structure with params:', { ownerName, repositoryName, branchName, key });

        if (!ownerName || !repositoryName || !branchName || !key) {
            return of('');
        }

        const headers =  this.getHeaders()
        return this.http.get(`${this.routes.githubApiRepositories}/${ownerName}/${repositoryName}/${this.routes.githubApiContents}/${key}/?ref=${branchName}`, { headers });
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