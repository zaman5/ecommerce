import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="section">
      <div class="container auth-wrap">
        <div class="card card-pad auth-card">
          <div class="center">
            <img src="assets/WonderCart.png" alt="WonderCart" class="auth-logo-img" />
            <h1>Create your account</h1>
            <p class="text-muted">Join WonderCart for faster checkout and order tracking.</p>
          </div>

          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }

          <div class="field">
            <label>Full name <span class="req">*</span></label>
            <input class="input" [(ngModel)]="name" placeholder="Your name" autocomplete="name" />
          </div>

          <div class="field">
            <label>Email <span class="req">*</span></label>
            <input class="input" type="email" [(ngModel)]="email" placeholder="you@example.com" autocomplete="email" />
          </div>

          <div class="field">
            <label>Phone <span class="req">*</span></label>
            <input class="input" type="tel" [(ngModel)]="phone" placeholder="03xx-xxxxxxx" autocomplete="tel" />
          </div>

          <div class="field">
            <label>Password <span class="req">*</span></label>
            <div class="pw-wrap">
              <input
                class="input"
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                placeholder="At least 8 characters with letters & numbers"
                (keyup.enter)="submit()"
                autocomplete="new-password"
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

            <!-- Password strength indicator -->
            @if (password()) {
              <div class="pw-strength">
                <div class="pw-meter">
                  <div
                    class="pw-bar"
                    [class.weak]="strength() === 'weak'"
                    [class.medium]="strength() === 'medium'"
                    [class.strong]="strength() === 'strong'"
                  ></div>
                </div>
                <div class="pw-labels">
                  <span class="pw-level" [class]="strength()">
                    {{ strengthLabel() }}
                  </span>
                  <div class="pw-reqs">
                    <span [class.met]="hasMinLen()">{{ hasMinLen() ? '✓' : '○' }} 8+ chars</span>
                    <span [class.met]="hasLetters()">{{ hasLetters() ? '✓' : '○' }} Letters</span>
                    <span [class.met]="hasNumbers()">{{ hasNumbers() ? '✓' : '○' }} Numbers</span>
                  </div>
                </div>
              </div>
            }
          </div>

          <button class="btn btn-primary btn-block mt" [disabled]="loading()" (click)="submit()">
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </button>

          <p class="center mt">Already have an account? <a routerLink="/login" class="link">Log in</a></p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .auth-wrap { max-width: 480px; margin: 0 auto; }
    .auth-card { padding: 34px 28px; }
    .emoji { height: 80px; width: auto; margin: 0 auto 6px; }
    .req { color: var(--accent); }
    .link { color: var(--ink); font-weight: 700; }
    .link:hover { color: var(--brand); }
    .auth-logo-img { max-width: 220px; height: auto; margin: 0 auto 14px; display: block; }

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

    /* Password strength meter */
    .pw-strength { margin-top: 8px; }
    .pw-meter { height: 5px; background: var(--line); border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
    .pw-bar { height: 100%; width: 0; transition: width .3s ease, background-color .3s ease; }
    .pw-bar.weak { width: 33%; background: #f43f5e; }
    .pw-bar.medium { width: 66%; background: #fbbf24; }
    .pw-bar.strong { width: 100%; background: #10b981; }

    .pw-labels { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; }
    .pw-level { font-weight: 700; text-transform: capitalize; }
    .pw-level.weak { color: #f43f5e; }
    .pw-level.medium { color: #d97706; }
    .pw-level.strong { color: #10b981; }

    .pw-reqs { display: flex; gap: 10px; color: var(--muted); }
    .pw-reqs span.met { color: #10b981; font-weight: 700; }
  `],
})
export class RegisterComponent {
  name = signal('');
  email = signal('');
  phone = signal('');
  password = signal('');
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  hasMinLen = computed(() => this.password().length >= 8);
  hasLetters = computed(() => /[a-zA-Z]/.test(this.password()));
  hasNumbers = computed(() => /[0-9]/.test(this.password()));

  strength = computed(() => {
    const pw = this.password();
    if (!pw) return 'weak';
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-zA-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 12) score++;

    if (score <= 2) return 'weak';
    if (score === 3) return 'medium';
    return 'strong';
  });

  strengthLabel = computed(() => {
    const s = this.strength();
    if (s === 'weak') return 'Weak password';
    if (s === 'medium') return 'Medium password';
    return 'Strong password ✨';
  });

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    const nameVal = this.name().trim();
    const emailVal = this.email().trim();
    const phoneVal = this.phone().trim();
    const pwVal = this.password();

    if (!nameVal || !emailVal || !phoneVal || !pwVal) {
      this.error.set('Please fill in all required fields (Full name, Email, Phone, and Password).');
      return;
    }
    if (phoneVal.length < 8) {
      this.error.set('Please enter a valid phone number (at least 8 digits).');
      return;
    }
    if (pwVal.length < 8) {
      this.error.set('Password must be at least 8 characters long.');
      return;
    }
    if (!this.hasLetters() || !this.hasNumbers()) {
      this.error.set('Password must contain both letters and numbers for account security.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.register({ name: nameVal, email: emailVal, phone: phoneVal, password: pwVal }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(err.error?.message || 'Registration failed. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
