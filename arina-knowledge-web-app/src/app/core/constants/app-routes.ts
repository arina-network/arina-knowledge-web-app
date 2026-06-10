import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppRoutes {
    // arina network
    public readonly company = 'https://arina.network';
    public readonly guide = 'https://github.com/arina-network/arina-knowledge-guide';

    // github
    public readonly github = 'https://github.com';
    public readonly githubApi = 'https://api.github.com';

    public readonly githubApiUserInfo = `${this.githubApi}/user`;
    public readonly githubApiRepositories = `${this.githubApi}/repos`;

    public readonly githubApiContents = 'contents';
    public readonly githubApiBranches = 'branches';

    public readonly githubRaw = 'https://raw.githubusercontent.com';

    // knowledge app
    public readonly home = '/';
    public readonly login = '/login';
    public readonly logout = '/logout';
    public readonly settings = '/settings';
    public readonly knowledge = '/knowledge';
}