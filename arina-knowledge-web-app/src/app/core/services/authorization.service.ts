import { Injectable, signal } from '@angular/core';

import { UserInfo } from '../models/user-info';

@Injectable({
    providedIn: 'root'
})
export class AuthorizationService {
    // store token strictly in-memory (wipes out on page refresh)
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
        this.userToken.set(null);
        this.userInfo.set(null);
    }

    isAuthorized(): boolean {
        return this.userToken() !== null;
    }
}
