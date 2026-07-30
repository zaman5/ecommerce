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
          <div class="center"><div class="emoji">🧸</div><h1>Welcome back</h1><p class="text-muted">Log in to your Funkybunky account.</p></div>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="field"><label>Email</label><input class="input" type="email" [(ngModel)]="email" (keyup.enter)="submit()" placeholder="you@example.com" /></div>
          <div class="field"><label>Password</label><input class="input" type="password" [(ngModel)]="password" (keyup.enter)="submit()" placeholder="••••••••" /></div>
          <button class="btn btn-primary btn-block" [disabled]="loading()" (click)="submit()">{{ loading() ? 'Logging in…' : 'Log in' }}</button>
          <p class="center mt">New here? <a routerLink="/register" class="link">Create an account</a></p>
          <div class="demo">
            <strong>Demo accounts</strong>
            <span>Admin: admin&#64;funkybunky.pk / admin12345</span>
            <span>Customer: customer&#64;funkybunky.pk / customer123</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .auth-wrap { max-width:460px; margin:0 auto; }
    .auth-card { padding:34px; }
    .emoji { font-size:2.6rem; }
    .link { color: var(--coral); font-weight:700; }
    .demo { margin-top:20px; background: var(--mint-soft); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:4px; font-size:.85rem; }
    .demo span { color: var(--muted); }
  `],
})
export class LoginComponent {
  email = ''; password = '';
  loading = signal(false); error = signal('');
  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}
  submit() {
    if (!this.email || !this.password) { this.error.set('Please enter your email and password.'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        const redirect = this.route.snapshot.queryParams['redirect'];
        this.router.navigateByUrl(redirect || (res.user.role === 'admin' ? '/admin' : '/'));
      },
      error: (err) => { this.error.set(err.error?.message || 'Login failed.'); this.loading.set(false); },
    });
  }
}
