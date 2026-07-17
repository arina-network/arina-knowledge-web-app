import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, RouteReuseStrategy, withEnabledBlockingInitialNavigation, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { CustomRouteReuseStrategy } from './custom-route-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, 
        withHashLocation(),
        withEnabledBlockingInitialNavigation()
    ),
    { provide: RouteReuseStrategy, useClass: CustomRouteReuseStrategy } 
  ]
};
