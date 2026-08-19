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
          <img src="assets/logo.png" alt="Wondercart" class="brand-img" width="480" height="341" />
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
          <a routerLink="/contact">Contact us</a>
          <a routerLink="/terms" fragment="returns">Shipping &amp; returns</a>
          <a routerLink="/terms">Terms &amp; Conditions</a>
        </div>
      </div>
      <div class="foot-bottom">
        <div class="container foot-bottom-inner">
          <span>© {{ year }} Wondercart. Packed with care for every school day.</span>
          <span class="foot-links">
            <a routerLink="/terms">Terms &amp; Conditions</a>
            <a routerLink="/contact">Contact us</a>
          </span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer { background: #fff; border-top: 1px solid var(--line); margin-top: 40px; }
    .foot-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px; padding: 48px 20px 28px; }
    .brand-img { height: 76px; width: auto; display: block; margin-bottom: 12px; }
    .footer h4 { font-size: 1rem; margin-bottom: 12px; }
    .footer a { display: block; color: var(--muted); padding: 5px 0; }
    .footer a:hover { color: var(--brand); }
    .foot-bottom { border-top: 1px solid var(--line); padding: 18px 0; color: var(--muted); font-size: .9rem; }
    .foot-bottom-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .foot-links { display: flex; gap: 18px; }
    .foot-links a { display: inline; padding: 0; }
    @media (max-width: 720px) { .foot-grid { grid-template-columns: 1fr 1fr; gap: 24px; } }
    @media (max-width: 560px) { .foot-bottom-inner { flex-direction: column; text-align: center; } }
  `],
})
export class FooterComponent {
  year = new Date().getFullYear();
}
