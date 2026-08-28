import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppRoutes {
    // arina network
    public readonly company = 'https://arina.network';

    // github
    public readonly github = 'https://github.com';
    public readonly githubBlob = `blob`;

    public readonly githubApi = 'https://api.github.com';

    public readonly githubApiUserInfo = `${this.githubApi}/user`;
    public readonly githubApiRepositories = `${this.githubApi}/repos`;

    public readonly githubApiContents = 'contents';
    public readonly githubApiBranches = 'branches';

    public readonly githubRaw = 'https://raw.githubusercontent.com';

    // knowledge app
    public readonly home = '/';
    public readonly team = '/team';

    public readonly login = '/login';
    public readonly logout = '/logout';
    public readonly settings = '/settings';
    
    public readonly knowledge = '/knowledge';

    // knowledge backend

    // public readonly backendGitHubLogin = 'https://info.arina.network/api/githublogin';
    // public readonly backendGitHubLogout = 'https://info.arina.network/api/githublogout';
    // public readonly backendGitHubToken = 'https://info.arina.network/api/githubtoken';
    // public readonly backendGitHubInstallation = 'https://info.arina.network/api/githubinstallation';
    // public readonly backendGitHubCompleteInstallation = 'https://info.arina.network/api/githubcompleteinstallation';
    // public readonly backendGitHubAppInstallation = 'https://github.com/apps/arina-network/installations/new';

    // local DEV
    public readonly backendGitHubLogin = 'https://localhost:44323/api/githublogin';
    public readonly backendGitHubLogout = 'https://localhost:44323/api/githublogout';
    public readonly backendGitHubToken = 'https://localhost:44323/api/githubtoken';
    public readonly backendGitHubInstallation = 'https://localhost:44323/api/githubinstallation';
    public readonly backendGitHubCompleteInstallation = 'https://localhost:44323/api/githubcompleteinstallation';
    public readonly backendGitHubAppInstallation = 'https://github.com/apps/dev-arina-network/installations/new';

    // arina knowledge
    public readonly arina = `${this.knowledge}/arina-network/arina-knowledge`
    public readonly articles = `${this.knowledge}/arina-network/arina-knowledge/main/articles`
    public readonly guides = `${this.knowledge}/arina-network/arina-knowledge/main/guides`
    public readonly models = `${this.knowledge}/arina-network/arina-knowledge/main/models`
}