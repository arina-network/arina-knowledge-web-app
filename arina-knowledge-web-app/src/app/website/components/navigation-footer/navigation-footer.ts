import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppRoutes } from '../../../core/constants/app-routes';

@Component({
    selector: 'app-navigation-footer',
    imports: [
        RouterLink
    ],
    templateUrl: './navigation-footer.html'
})
export class NavigationFooter {
    protected readonly routes = new AppRoutes();
    protected readonly companyName = "Arina Network";

    protected currentYear() {
        return new Date().getFullYear();
    }
}
