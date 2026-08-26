import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { AuthorizationService } from './core/services/authorization.service';
import { AuthorizationInterceptor } from './core/services/authorization.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
        withInterceptors([AuthorizationInterceptor])
    ),    
    // provideBrowserGlobalErrorListeners(),
    provideRouter(routes, 
        withHashLocation(),
        withComponentInputBinding()
    ),
    provideAppInitializer(() => {
        const authorizationService = inject(AuthorizationService);
        return authorizationService.checkGitHubToken();
    })
  ]
};
