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
    {/*
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
        },*/
        // matcher: (urlSegments) => {
        //     if (urlSegments.length <= 1 || urlSegments[0].path !== 'knowledge') {
        //         return null;
        //     }

        //     // Scenario 2: /knowledge/:owner/:repository (3 segments)
        //     if (urlSegments.length === 3) {
        //         return {
        //             consumed: urlSegments,
        //             posParams: {
        //                 owner: urlSegments[1],
        //                 repository: urlSegments[2]
        //             }
        //         };
        //     }

        //     // Scenario 3 & 4: /knowledge/:owner/:repository/:branch/... (4+ segments)
        //     if (urlSegments.length >= 4) {
        //         const trailingSegments = urlSegments.slice(4);

        //         return {
        //             consumed: urlSegments,
        //             posParams: {
        //                 owner: urlSegments[1],
        //                 repository: urlSegments[2],
        //                 branch: urlSegments[3],
        //                 // FIX: Bind a real, existing reference from Angular's array.
        //                 // Do NOT use 'new UrlSegment()'. This keeps the router tree stable.
        //                 key: trailingSegments.length > 0 ? trailingSegments[0] : new UrlSegment('', {})
        //             }
        //         };
        //     }

        //     return null;
        // },
        //     matcher: (urlSegments) => {
        //     if (urlSegments.length <= 1 || urlSegments[0].path !== 'knowledge') {
        //         return null;
        //     }

        //     // Scenario 2: /knowledge/:owner/:repository (Exactly 3 segments)
        //     if (urlSegments.length === 3) {
        //         return {
        //             consumed: urlSegments,
        //             posParams: {
        //                 owner: urlSegments[1],
        //                 repository: urlSegments[2]
        //             }
        //         };
        //     }

        //     // Scenario 3 & 4: /knowledge/:owner/:repository/:branch/... (4+ segments)
        //     if (urlSegments.length >= 4) {
        //         const trailingSegments = urlSegments.slice(4);

        //         // CRITICAL FIX: Extract EXACTLY ONE single UrlSegment reference.
        //         // Do not pass the whole remaining array. This prevents internal types from changing.
        //         const fallbackSegment = new UrlSegment('', {});
        //         const primaryKeySegment = trailingSegments.length > 0 ? trailingSegments[0] : fallbackSegment;

        //         return {
        //             consumed: urlSegments,
        //             posParams: {
        //                 owner: urlSegments[1],
        //                 repository: urlSegments[2],
        //                 branch: urlSegments[3],
        //                 key: primaryKeySegment // Maps to exactly 1 stable object reference
        //             }
        //         };
        //     }

        //     return null;
        // },
        // matcher: (urlSegments) => {
        //     if (urlSegments.length <= 1 || urlSegments[0].path !== 'knowledge') {
        //         return null;
        //     }

        //     // CRITICAL FIX: To prevent Angular from crashing during component reuse,
        //     // the schema structure of posParams MUST stay identical for all route variants.
        //     const ownerSegment = urlSegments[1] || new UrlSegment('', {});
        //     const repoSegment = urlSegments[2] || new UrlSegment('', {});
        //     const branchSegment = urlSegments[3] || new UrlSegment('', {});
            
        //     // Capture the first dynamic key token for Angular's parameter system structural binding
        //     const keySegment = urlSegments[4] || new UrlSegment('', {});

        //     return {
        //         consumed: urlSegments,
        //         posParams: {
        //             owner: ownerSegment,
        //             repository: repoSegment,
        //             branch: branchSegment,
        //             key: keySegment // Keep a fixed structural anchor
        //         }
        //     };
        // },
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

