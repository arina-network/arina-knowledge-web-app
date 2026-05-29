import { Component } from '@angular/core';

import { AppRoutes } from '../../constants/app-routes';

@Component({
  selector: 'app-navigation-footer',
  imports: [],
  templateUrl: './navigation-footer.html'
})
export class NavigationFooter {
    protected readonly routes = new AppRoutes();
    protected readonly companyName = "Arina Network";

    protected currentYear() {
        return new Date().getFullYear();
    }
}
