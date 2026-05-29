import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Params } from "@angular/router";
import { Subscription } from "rxjs";

import { Message } from "../../models/message";

import { AppActions } from "../../constants/app-actions";
import { AppParams } from "../../constants/app-params";

@Component({
    template: ''
})
export class BaseDataComponent
    implements OnInit, OnDestroy {

    key?: string;
    action = AppActions.Show;

    protected messages: Message[] = [];
    private _isDataLoading = false;

    public get isDataLoading(): boolean {
        return this._isDataLoading;
    }

    public set isDataLoading(value: boolean) {
        this._isDataLoading = value;
    }

    private readonly subscriptions: Subscription[] = [];

    constructor(
        protected readonly route: ActivatedRoute
    ) { }

    async refreshParams(params: Params) {
        this.key = params[AppParams.Key];
        this.action = params[AppParams.Action];

        this.refreshData();
    }

    async refreshData() {
        // empty method
    }

    async refreshLookupData() {
        // empty method
    }

    clearMessages() {
        this.messages = [];
    }

    initSubsriptions() {
        this.addSubscription(this.route.params.subscribe(p =>
            this.refreshParams(p)
        ));
    }

    addSubscription(subscription: Subscription) {
        this.subscriptions.push(subscription);
    }

    clearSubscriptions() {
        this.subscriptions.forEach(x => x.unsubscribe());
    }

    async ngOnInit() {
        await this.refreshLookupData()
        this.initSubsriptions();
    }

    ngOnDestroy() {
        this.clearSubscriptions();
    }
}
