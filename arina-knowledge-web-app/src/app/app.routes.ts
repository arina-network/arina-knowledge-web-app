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
            // Instantly exit if the root word isn't 'knowledge'
            if (urlSegments.length === 0 || urlSegments[0].path !== 'knowledge') {
                return null;
            }

            // Scenario 1: /knowledge (1 segment)
            // Matches: /knowledge
            if (urlSegments.length === 1) {
                return { 
                    consumed: urlSegments 
                };
            }

            // Scenario 2: /knowledge/:owner/:repository (Exactly 3 segments)
            // Matches: /knowledge/arina-network/arina-knowledge
            if (urlSegments.length === 3) {
                return {
                    consumed: urlSegments,
                    posParams: {
                        owner: urlSegments[1],      // 'arina-network'
                        repository: urlSegments[2]  // 'arina-knowledge'
                    }
                };
            }

            // Scenario 3 & 4: /knowledge/:owner/:repository/:branch/... (4+ segments)
            // Matches: /knowledge/arina-network/arina-knowledge/main/models
            if (urlSegments.length >= 4) {
                const trailingSegments = urlSegments.slice(4);
                const keyString = trailingSegments.map(s => s.path).join('/');

                return {
                    consumed: urlSegments,
                    posParams: {
                        owner: urlSegments[1],
                        repository: urlSegments[2],
                        branch: urlSegments[3],
                        key: new UrlSegment(keyString, {})
                    }
                };
            }

            // Returns null so it doesn't cause a silent router engine crash
            return null;
        },
        component: StructureDesignerComponent
    }    
];

