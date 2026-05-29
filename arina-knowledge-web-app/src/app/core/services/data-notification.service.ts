import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

import { AppProcesses } from "../constants/app-processes";

import { Structure } from "../../knowledge/models/structure";
import { DataNotification } from "../models/data-notification";

import { BaseService } from "./base.service";

@Injectable({
    providedIn: 'root'
})
export class DataNotificationService
    extends BaseService{

    private readonly notifications$ = new BehaviorSubject<DataNotification>(null);
    notifications = this.notifications$.asObservable();

    notifyCreated(structure: Structure) {
        if (!structure) {
            return;
        }

        const event: DataNotification = {
            structure,
            process: AppProcesses.Create
        };

        this.notifications$.next(event);
    }

    notifyModified(structure: Structure) {
        if (!structure) {
            return;
        }

        const event: DataNotification = {
            structure,
            process: AppProcesses.Modify
        };

        this.notifications$.next(event);
    }
}
