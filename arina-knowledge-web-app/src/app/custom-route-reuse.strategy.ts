// import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

// export class CustomRouteReuseStrategy extends BaseRouteReuseStrategy {
//     override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
//         // If the components are the same, check if their route parameters match exactly
//         if (future.routeConfig === curr.routeConfig) {
//             const futureParams = JSON.stringify(future.params);
//             const currParams = JSON.stringify(curr.params);
        
//             // If parameters have changed, do NOT reuse. Re-create the component fresh.
//             return futureParams === currParams;
//         }
    
//         // Default fallback behavior
//         return future.routeConfig === curr.routeConfig;
//     }
// }
