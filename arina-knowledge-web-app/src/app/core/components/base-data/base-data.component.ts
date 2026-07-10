import { ChangeDetectorRef, Component, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Params } from "@angular/router";

import { Message } from "../../models/message";

import { AppActions } from "../../constants/app-actions";
import { AppParams } from "../../constants/app-params";

@Component({
    template: ''
})
export class BaseDataComponent {
    protected cdr = inject(ChangeDetectorRef);   

    protected route = inject(ActivatedRoute);

    owner?: string;
    repository?: string;
    branch?: string;
    key?: string;

    action = AppActions.Show;

    protected messages: Message[] = [];

    public isDataLoading = signal<boolean>(false);
    protected params = toSignal(this.route.params);    

    constructor() {
        effect(() => {
            const currentParams = this.params();
            if (currentParams) {
                this.refreshParams(currentParams);
            } else {
                this.clearParams();
            }
        });
    }    

    async refreshParams(params: Params) {
        // console.log('refreshParams: ', params);

        this.owner = params[AppParams.Owner];
        this.repository = params[AppParams.Repository];
        this.branch = params[AppParams.Branch] ?? 'main';
        this.key = params[AppParams.Key];

        this.action = params[AppParams.Action];

        // console.log('refreshParams p2');
        this.refreshData();
        // console.log('refreshParams p3');
    }

    async clearParams() {
        // console.log('refreshParams: ', params);

        this.owner = undefined;
        this.repository = undefined;
        this.branch = undefined;
        this.key = undefined;

        this.action = AppActions.Show;
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
}
