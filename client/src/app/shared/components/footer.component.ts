import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container foot-grid">
        <div>
          <div class="brand">🎒 Wonder<span>cart</span></div>
          <p class="text-muted">Everything your child needs for school — trusted quality, fair prices, and fast delivery across Pakistan.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <a routerLink="/shop">All products</a>
          <a routerLink="/shop">New arrivals</a>
          <a routerLink="/shop">Best sellers</a>
        </div>
        <div>
          <h4>Account</h4>
          <a routerLink="/login">Log in</a>
          <a routerLink="/register">Create account</a>
          <a routerLink="/account/orders">Track order</a>
        </div>
        <div>
          <h4>Help</h4>
          <a href="#">Shipping & returns</a>
          <a href="#">Contact us</a>
          <a href="#">FAQ</a>
        </div>
      </div>
      <div class="foot-bottom">
        <div class="container">© {{ year }} Wondercart. Packed with care for every school day.</div>
      </div>
    </footer>
  `,
  styles: [`
    .footer { background: #fff; border-top: 1px solid var(--line); margin-top: 40px; }
    .foot-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px; padding: 48px 20px 28px; }
    .brand { font-family: var(--font-display); font-weight: 800; font-size: 1.4rem; margin-bottom: 10px; }
    .brand span { color: var(--coral); }
    .footer h4 { font-size: 1rem; margin-bottom: 12px; }
    .footer a { display: block; color: var(--muted); padding: 5px 0; }
    .footer a:hover { color: var(--coral); }
    .foot-bottom { border-top: 1px solid var(--line); padding: 18px 0; color: var(--muted); font-size: .9rem; text-align: center; }
    @media (max-width: 720px) { .foot-grid { grid-template-columns: 1fr 1fr; gap: 24px; } }
  `],
})
export class FooterComponent {
  year = new Date().getFullYear();
}
