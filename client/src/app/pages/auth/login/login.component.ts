import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="section">
      <div class="container auth-wrap">
        <div class="card card-pad auth-card">
          <div class="center">
            <img src="assets/WonderCart.png?v=20260824" alt="WonderCart" class="auth-logo-img" />
            <h1>Welcome back</h1>
            <p class="text-muted">Log in to your WonderCart account.</p>
          </div>

          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }

          <div class="field">
            <label>Email</label>
            <input class="input" type="email" [(ngModel)]="email" (keyup.enter)="submit()" placeholder="you@example.com" autocomplete="email" />
          </div>

          <div class="field">
            <label>Password</label>
            <div class="pw-wrap">
              <input
                class="input"
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                (keyup.enter)="submit()"
                placeholder="••••••••"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="pw-toggle"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                [title]="showPassword() ? 'Hide password' : 'Show password'"
              >
                @if (showPassword()) {
                  <!-- Eye Off Icon (Hide) -->
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-svg">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                } @else {
                  <!-- Eye Open Icon (Show) -->
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-svg">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
              </button>
            </div>
          </div>

          <button class="btn btn-primary btn-block mt" [disabled]="loading()" (click)="submit()">
            {{ loading() ? 'Logging in…' : 'Log in' }}
          </button>

          <p class="center mt">New here? <a routerLink="/register" class="link">Create an account</a></p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .auth-wrap { max-width: 480px; margin: 0 auto; width: 100%; }
    .auth-card { padding: clamp(20px, 5vw, 34px) clamp(16px, 4vw, 28px); }
    .emoji { height: 80px; width: auto; margin: 0 auto 6px; }
    .link { color: var(--ink); font-weight: 700; }
    .link:hover { color: var(--brand); }
    .auth-logo-img { max-width: clamp(160px, 45vw, 220px); height: auto; margin: 0 auto 14px; display: block; }

    /* Password input with toggle */
    .pw-wrap { position: relative; display: flex; align-items: center; }
    .pw-wrap .input { padding-right: 46px; }
    .pw-toggle {
      position: absolute; right: 8px; background: none; border: none;
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; cursor: pointer; padding: 0; border-radius: 8px;
      color: var(--muted); transition: color .15s ease, background-color .15s ease;
    }
    .pw-toggle:hover { color: var(--ink); background: var(--soft); }
    .pw-toggle:focus-visible { outline: 2px solid var(--brand); }
    .eye-svg { width: 20px; height: 20px; stroke: currentColor; }
  `],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  submit() {
    if (!this.email || !this.password) {
      this.error.set('Please enter your email and password.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        const redirect = this.route.snapshot.queryParams['redirect'];
        if (redirect) {
          this.router.navigateByUrl(redirect);
        } else if (res.user.role === 'admin') {
          this.router.navigateByUrl('/admin');
        } else if (res.user.role === 'shopmanager') {
          this.router.navigateByUrl('/shop-manager');
        } else {
          this.router.navigateByUrl('/');
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Login failed.');
        this.loading.set(false);
      },
    });
  }
}
