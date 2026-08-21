import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-team',
  imports: [
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './team.component.html'
})
export class TeamComponent {
}
