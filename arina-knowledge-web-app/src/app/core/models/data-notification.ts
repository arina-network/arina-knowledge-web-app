import { AppProcesses } from "../constants/app-processes";

import { Structure } from "../../knowledge/models/structure";

export interface DataNotification {
    structure: Structure;
    process: AppProcesses;
}
