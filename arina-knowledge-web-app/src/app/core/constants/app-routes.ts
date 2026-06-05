import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppRoutes {
    public readonly github = 'https://github.com';
    public readonly githubApi = 'https://api.github.com';

    public readonly company = 'https://arina.network';
    public readonly guide = 'https://github.com/arina-network/arina-knowledge-guide';

    public readonly home = '/';
    public readonly login = '/login';
    public readonly logout = '/logout';
    public readonly settings = '/settings';
}