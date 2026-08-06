import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="nav">
      <div class="container nav-inner">
        <a routerLink="/" class="brand" (click)="menuOpen.set(false)">
          <span class="logo-mark">🎒</span>
          <span class="logo-text">Wonder<span>cart</span></span>
        </a>

        <nav class="links" [class.open]="menuOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="menuOpen.set(false)">Home</a>
          <a routerLink="/shop" routerLinkActive="active" (click)="menuOpen.set(false)">Shop</a>
          @if ((auth.isLoggedIn() && !auth.isAdmin()) || hasGuestOrders()) {
            <a routerLink="/account/orders" routerLinkActive="active" (click)="menuOpen.set(false)">My Orders</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active" (click)="menuOpen.set(false)">Admin</a>
          }
          <div class="mobile-auth">
            @if (auth.isLoggedIn()) {
              <button class="btn btn-ghost btn-sm" (click)="logout()">Log out</button>
            } @else {
              <a class="btn btn-primary btn-sm" routerLink="/login" (click)="menuOpen.set(false)">Log in</a>
            }
          </div>
        </nav>

        <div class="actions">
          <a routerLink="/cart" class="cart-btn" aria-label="Cart">
            🛒
            @if (cart.count() > 0) { <span class="cart-badge">{{ cart.count() }}</span> }
          </a>
          @if (auth.isLoggedIn()) {
            <div class="user-chip hide-sm">
              <span>Hi, {{ firstName() }}</span>
              <button class="btn btn-ghost btn-sm" (click)="logout()">Log out</button>
            </div>
          } @else {
            <a class="btn btn-primary btn-sm hide-sm" routerLink="/login">Log in</a>
          }
          <button class="burger" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,.9); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 68px; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 800; font-size: 1.5rem; }
    .logo-mark { font-size: 1.7rem; }
    .logo-text span { color: var(--coral); }
    .links { display: flex; align-items: center; gap: 26px; }
    .links a { font-family: var(--font-display); font-weight: 600; color: var(--ink); position: relative; padding: 4px 0; }
    .links a.active { color: var(--coral); }
    .links a.active::after { content:''; position:absolute; left:0; right:0; bottom:-4px; height:3px; border-radius:3px; background: var(--coral); }
    .actions { display: flex; align-items: center; gap: 14px; }
    .cart-btn { position: relative; font-size: 1.4rem; }
    .cart-badge { position: absolute; top: -8px; right: -10px; background: var(--coral); color:#fff; font-family: var(--font-body); font-weight: 800; font-size: .7rem; min-width: 20px; height: 20px; border-radius: 999px; display: grid; place-items: center; padding: 0 4px; }
    .user-chip { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: .9rem; }
    .mobile-auth { display: none; }
    .burger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; }
    .burger span { width: 24px; height: 3px; background: var(--ink); border-radius: 3px; }
    @media (max-width: 860px) {
      .burger { display: flex; }
      .links { position: fixed; inset: 68px 0 auto 0; flex-direction: column; align-items: flex-start; gap: 6px; background: #fff; padding: 18px 24px; border-bottom: 1px solid var(--line); box-shadow: var(--shadow); transform: translateY(-120%); transition: transform .25s ease; }
      .links.open { transform: translateY(0); }
      .links a { padding: 10px 0; width: 100%; border-bottom: 1px solid var(--line); }
      .mobile-auth { display: block; padding-top: 12px; }
    }
  `],
})
export class NavbarComponent {
  menuOpen = signal(false);
  constructor(
    public auth: AuthService,
    public cart: CartService,
    private orders: OrderService,
    private router: Router
  ) {}
  firstName() { return this.auth.user()?.name?.split(' ')[0] ?? ''; }
  /** Guests still get an orders link once they've placed something. */
  hasGuestOrders() { return !this.auth.isLoggedIn() && this.orders.guestOrders().length > 0; }
  logout() {
    this.auth.logout();
    this.menuOpen.set(false);
    this.router.navigate(['/']);
  }
  @HostListener('window:resize') onResize() { if (window.innerWidth > 860) this.menuOpen.set(false); }
}
