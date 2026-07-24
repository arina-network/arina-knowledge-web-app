import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-progress-export',
    standalone: true,
    imports: [
        MatDialogModule, 
        MatProgressSpinnerModule
    ],
    templateUrl: './progress-export.component.html'
})
export class ProgressExportComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { currentFile: string }) {}
}