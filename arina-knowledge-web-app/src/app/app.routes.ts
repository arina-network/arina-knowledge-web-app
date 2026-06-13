import { Routes, UrlSegment } from '@angular/router';

import { HomeComponent } from './website/components/home/home.component';
import { LoginComponent } from './website/components/login/login.component';
import { LogoutComponent } from './website/components/logout/logout.component';
import { SettingsComponent } from './website/components/settings/settings.component';

import { StructureDesignerComponent } from './knowledge/components/structure-designer/structure-designer.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'logout', component: LogoutComponent },
    { path: 'settings', component: SettingsComponent },

    {
    path: 'knowledge',
    children: [
        {
            // This matcher handles all scenarios: 
            // 1. /knowledge
            // 2. /knowledge/arina-network/arina-knowledge
            // 3. /knowledge/arina-network/arina-knowledge/main
            // 4. /knowledge/arina-network/arina-knowledge/main/README.md
            matcher: (urlSegments) => {
                // Scenario 1: /knowledge (No extra segments)
                if (urlSegments.length === 0) {
                    return { consumed: urlSegments };
                }

                // Scenario 2: /knowledge/:owner/:repository (Exactly 2 segments)
                if (urlSegments.length === 2) {
                    return {
                        consumed: urlSegments,
                        posParams: {
                        owner: urlSegments[0],
                        repository: urlSegments[1]
                        }
                    };
                }

                // Scenarios 3 & 4: Has at least 3 segments (owner, repo, branch)
                if (urlSegments.length >= 3) {
                    const owner = urlSegments[0];
                    const repository = urlSegments[1];
                    const branch = urlSegments[2];
                    
                    // Re-assemble remaining segments safely, even with dots (.) or slashes (/)
                    const trailingSegments = urlSegments.slice(3);
                    const keyString = trailingSegments.map(s => s.path).join('/');

                    return {
                        consumed: urlSegments,
                        posParams: {
                        owner,
                        repository,
                        branch,
                        // Inject the manual parameter key mapping
                        key: new UrlSegment(keyString, {}) 
                        }
                    };
                }

                return null; // Fallback if it doesn't fit rules
            },
            component: StructureDesignerComponent
        }
    ]
    }    
    // {  path: 'knowledge',
    //     children: [
    //         {
    //             path: '',
    //             component: StructureDesignerComponent
    //         },
    //         {
    //             path: ':owner/:repository',
    //             component: StructureDesignerComponent
    //         },
    //         {
    //             path: ':owner/:repository/:branch',
    //             component: StructureDesignerComponent
    //         },
    //         {
    //             path: ':owner/:repository/:branch/**key',
    //             component: StructureDesignerComponent
    //         }
    //     ]
    // }
];
