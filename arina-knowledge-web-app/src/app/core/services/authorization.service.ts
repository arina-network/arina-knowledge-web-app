import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class AuthorizationService {
    // store token strictly in-memory (wipes out on page refresh)
    private userToken = signal<string | null>(null);


    getToken(): string | null {
        return this.userToken();
    }

    setToken(token: string): void {
        this.userToken.set(token.trim());
    }

    clearToken(): void {
        this.userToken.set(null);
    }

    isAuthorized(): boolean {
        return this.userToken() !== null;
    }
}
