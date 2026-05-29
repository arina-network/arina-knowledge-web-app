import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export abstract class BaseService
    implements OnDestroy {

    private readonly subscriptions: Subscription[] = [];

    addSubscription(subscription: Subscription) {
        this.subscriptions.push(subscription);
    }

    clearSubscriptions() {
        this.subscriptions.forEach(x => x.unsubscribe());
    }

    ngOnDestroy() {
        this.clearSubscriptions();
    }
}
