import { Component, Input} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-progress',
    standalone: true, 
    imports: [MatProgressSpinnerModule],
    templateUrl: './progress.component.html'
})
export class ProgressComponent {
    @Input() loading = false;
}
