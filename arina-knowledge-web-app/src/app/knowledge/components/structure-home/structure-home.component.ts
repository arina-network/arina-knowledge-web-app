import { Component } from "@angular/core";

import { AppRoutes } from "@/app/core/constants/app-routes";

@Component({
    selector: 'app-structure-home',
    templateUrl: './structure-home.component.html'
})
export class StructureHomeComponent {

    constructor(
        public readonly routes: AppRoutes // used in HTML    
    ) { }
}