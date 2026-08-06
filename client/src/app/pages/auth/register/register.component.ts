import { Component, signal } from '@angular/core';
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
          <div class="center"><div class="emoji">🌟</div><h1>Create your account</h1><p class="text-muted">Join Wondercart for faster checkout and order tracking.</p></div>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="field"><label>Full name</label><input class="input" [(ngModel)]="form.name" placeholder="Your name" /></div>
          <div class="field"><label>Email</label><input class="input" type="email" [(ngModel)]="form.email" placeholder="you@example.com" /></div>
          <div class="field"><label>Phone (optional)</label><input class="input" [(ngModel)]="form.phone" placeholder="03xx-xxxxxxx" /></div>
          <div class="field"><label>Password</label><input class="input" type="password" [(ngModel)]="form.password" placeholder="At least 6 characters" (keyup.enter)="submit()" /></div>
          <button class="btn btn-primary btn-block" [disabled]="loading()" (click)="submit()">{{ loading() ? 'Creating…' : 'Create account' }}</button>
          <p class="center mt">Already have an account? <a routerLink="/login" class="link">Log in</a></p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .auth-wrap { max-width:460px; margin:0 auto; }
    .auth-card { padding:34px; }
    .emoji { font-size:2.6rem; }
    .link { color: var(--coral); font-weight:700; }
  `],
})
export class RegisterComponent {
  form = { name: '', email: '', phone: '', password: '' };
  loading = signal(false); error = signal('');
  constructor(private auth: AuthService, private router: Router) {}
  submit() {
    if (!this.form.name || !this.form.email || !this.form.password) { this.error.set('Please fill in all required fields.'); return; }
    if (this.form.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.register(this.form).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => { this.error.set(err.error?.message || 'Registration failed.'); this.loading.set(false); },
    });
  }
}
