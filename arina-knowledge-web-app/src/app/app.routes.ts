import { Routes, UrlSegment } from '@angular/router';

import { HomeComponent } from './website/components/home/home.component';
import { LoginComponent } from './website/components/login/login.component';
import { LogoutComponent } from './website/components/logout/logout.component';
import { SettingsComponent } from './website/components/settings/settings.component';

import { StructureDesignerComponent } from './knowledge/components/structure-designer/structure-designer.component';

export const routes: Routes = [
    { path: '', component: HomeComponent, pathMatch: 'full' },

    { path: 'login', component: LoginComponent },
    { path: 'logout', component: LogoutComponent },
    { path: 'settings', component: SettingsComponent },

    { path: 'knowledge', component: StructureDesignerComponent , pathMatch: 'full' },
    {
        matcher: (urlSegments) => {
            // Instantly skip if it's empty or doesn't start with 'knowledge'
            if (urlSegments.length === 0 || urlSegments[0].path !== 'knowledge') {
                return null;
            }

            // Scenario 2: /knowledge/:owner/:repository (Exactly 3 segments)
            if (urlSegments.length === 3) {
                return {
                    consumed: urlSegments,
                    posParams: {
                        owner: urlSegments[1],
                        repository: urlSegments[2]
                    }
                };
            }

            // Scenario 3, 4, & Deep Subfolders: /knowledge/:owner/:repository/:branch/... (4+ segments)
            if (urlSegments.length >= 4) {
                // STABLE SIGNATURE FIX: We ONLY specify owner, repository, and branch in posParams.
                // We do NOT attach 'key' here. By keeping this parameter signature perfectly static
                // across 4 segments or 50 segments, Angular's engine will NEVER crash when moving backwards.
                return {
                    consumed: urlSegments,
                    posParams: {
                        owner: urlSegments[1],
                        repository: urlSegments[2],
                        branch: urlSegments[3]
                    }
                };
            }

            return null;
        },        
        component: StructureDesignerComponent
    }    
];

