import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar.component';
import { FooterComponent } from './shared/components/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="app-main"><router-outlet></router-outlet></main>
    <app-footer></app-footer>
  `,
  styles: [`.app-main { min-height: 70vh; }`],
})
export class AppComponent {}
