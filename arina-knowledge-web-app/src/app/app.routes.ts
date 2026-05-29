import { Routes } from '@angular/router';

import { HomeComponent } from './website/components/home/home.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: ':key', component: HomeComponent }
];
