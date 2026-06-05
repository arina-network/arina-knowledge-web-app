import { Routes } from '@angular/router';

import { HomeComponent } from './website/components/home/home.component';
import { LoginComponent } from './website/components/login/login.component';
import { LogoutComponent } from './website/components/logout/logout.component';
import { SettingsComponent } from './website/components/settings/settings.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'logout', component: LogoutComponent },
    { path: 'settings', component: SettingsComponent },

    { path: ':key', component: HomeComponent }
];
