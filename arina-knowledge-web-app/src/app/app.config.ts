import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, RouteReuseStrategy, withComponentInputBinding, withEnabledBlockingInitialNavigation, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
// import { CustomRouteReuseStrategy } from './custom-route-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, 
        withHashLocation(),
        withComponentInputBinding()
        // withEnabledBlockingInitialNavigation()
    )
    // { provide: RouteReuseStrategy, useClass: CustomRouteReuseStrategy } 
  ]
};
