import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppRoutes {
    public readonly company = 'https://arina.network';
    public readonly github = 'https://github.com';
    public readonly guide = 'https://github.com/arina-network/arina-knowledge-guide';

    public readonly home = '/';
    public readonly settings = '/settings';
}