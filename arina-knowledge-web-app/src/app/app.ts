import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationHeader } from "./core/components/navigation-header/navigation-header";
import { NavigationFooter } from './core/components/navigation-footer/navigation-footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationHeader, NavigationFooter],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('arina-knowledge-web-app');
}
