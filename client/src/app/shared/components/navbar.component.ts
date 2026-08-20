import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { SavedService } from '../../core/services/saved.service';
import { CategoryService, OrderService } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { Category } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <header class="nav">
      <!-- ROW 1 — account / utility strip -->
      <div class="utility">
        <div class="container utility-inner">
          <div class="utility-left">
            @if (auth.isLoggedIn()) {
              <span>Hi {{ firstName() }}!</span>
              <button class="linkish" (click)="logout()">Sign out</button>
            } @else {
              <span>Hi!</span>
              <a routerLink="/login">Sign in</a>
              <span class="dim">or</span>
              <a routerLink="/register">register</a>
            }
            <a routerLink="/shop" [queryParams]="{ deals: 'true' }" class="hide-sm">Daily Deals</a>
          </div>
          <div class="utility-right">
            <!-- Theme Toggle Button (Light by default) -->
            <button
              class="theme-toggle-btn"
              (click)="themeService.toggleTheme()"
              [attr.aria-label]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
              [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            >
              @if (themeService.isDark()) {
                <span class="theme-icon">☀️</span> <span class="theme-label">Light Mode</span>
              } @else {
                <span class="theme-icon">🌙</span> <span class="theme-label">Dark Mode</span>
              }
            </button>

            @if ((auth.isLoggedIn() && !auth.isAdmin() && !auth.isShopManager()) || hasGuestOrders()) {
              <a routerLink="/account/orders">My Orders</a>
            }
            @if (auth.isAdmin()) { <a routerLink="/admin">Admin</a> }
            @if (auth.isShopManager()) { <a routerLink="/shop-manager">Shop Panel</a> }
          </div>
        </div>
      </div>

      <!-- ROW 2 — brand, category menu, search -->
      <div class="container main-inner">
        <button class="burger" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>

        <a routerLink="/" class="brand" (click)="closeAll()" aria-label="Wondercart — home">
          <img src="assets/logo.png" alt="Wondercart" class="logo-img" width="480" height="341" />
        </a>

        <!-- Search -->
        <form class="search" (ngSubmit)="doSearch()">
          <input
            class="search-input"
            type="search"
            name="q"
            [(ngModel)]="query"
            placeholder="Search for anything"
            aria-label="Search for anything"
          />
          <select class="search-cat" [(ngModel)]="scope" name="scope" aria-label="Category">
            <option value="">All Categories</option>
            @for (c of departments(); track c._id) {
              <optgroup [label]="c.name">
                <option [value]="c.slug">All {{ c.name }}</option>
                @for (s of subsOf(c.slug); track s._id) { <option [value]="s.slug">{{ s.name }}</option> }
              </optgroup>
            }
          </select>
          <button class="search-btn" type="submit">Search</button>
        </form>

        <div class="actions">
          <a routerLink="/saved" class="icon-btn wish" aria-label="Saved items">
            ♡
            @if (saved.count() > 0) { <span class="badge">{{ saved.count() }}</span> }
          </a>
          <a routerLink="/cart" class="icon-btn" aria-label="Cart">
            🛒
            @if (cart.count() > 0) { <span class="badge">{{ cart.count() }}</span> }
          </a>
        </div>
      </div>

      <!-- ROW 3 — category strip -->
      <nav class="strip" [class.open]="menuOpen()">
        <div class="container strip-inner">
          <a routerLink="/saved" routerLinkActive="active" (click)="closeAll()">Saved</a>
          <a routerLink="/shop" [queryParams]="{ deals: 'true' }" routerLinkActive="active" (click)="closeAll()">Deals</a>
          @for (c of strip(); track c._id) {
            <a
              [routerLink]="['/shop']"
              [queryParams]="{ category: c.slug }"
              routerLinkActive="active"
              (click)="closeAll()"
              >{{ c.name }}</a
            >
          }
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .nav { position: sticky; top: 0; z-index: 50; background: var(--surface); border-bottom: 1px solid var(--line); transition: background-color .2s ease, border-color .2s ease; }

    /* ---- row 1 ---- */
    .utility { background: var(--cream-deep); font-size: .8rem; border-bottom: 1px solid var(--line); transition: background-color .2s ease; }
    .utility-inner { display: flex; align-items: center; justify-content: space-between; height: 34px; gap: 16px; }
    .utility-left, .utility-right { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .utility a, .linkish { color: var(--ink); font-weight: 700; white-space: nowrap; }
    .utility a:hover, .linkish:hover { color: var(--brand-dark); text-decoration: underline; }
    .linkish { background: none; border: none; padding: 0; font: inherit; font-weight: 700; cursor: pointer; }
    .utility .dim { color: var(--muted); }

    /* Theme Toggle */
    .theme-toggle-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 999px;
      border: 1px solid var(--line); background: var(--surface);
      color: var(--ink); font-family: var(--font-body); font-size: .78rem; font-weight: 700;
      cursor: pointer; transition: all .15s ease;
    }
    .theme-toggle-btn:hover {
      border-color: var(--brand);
      color: var(--brand);
      transform: translateY(-1px);
    }
    .theme-icon { font-size: .9rem; }

    /* ---- row 2 ---- */
    .main-inner { display: flex; align-items: center; gap: 20px; height: 80px; }
    .brand { display: flex; align-items: center; flex: none; }
    .logo-img { height: 66px; width: auto; display: block; }

    .search {
      flex: 1; display: flex; align-items: stretch; min-width: 0;
      border: 2px solid var(--line); border-radius: 999px; overflow: hidden;
      background: var(--input-bg); height: 44px;
      transition: border-color .15s ease, box-shadow .15s ease, background-color .2s ease;
    }
    .search:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-glow); }
    .search-input { flex: 1; min-width: 0; border: none; outline: none; padding: 0 18px; font-family: var(--font-body); font-size: .95rem; color: var(--ink); background: transparent; }
    .search-cat { border: none; border-left: 1px solid var(--line); outline: none; background: var(--input-bg); font-family: var(--font-body); font-size: .85rem; color: var(--ink); padding: 0 8px; max-width: 150px; cursor: pointer; }
    .search-btn {
      border: none; background: var(--brand); color: #ffffff;
      font-family: var(--font-display); font-weight: 700; font-size: .98rem; padding: 0 32px;
      cursor: pointer; transition: background .15s ease, transform .1s ease; letter-spacing: .02em;
    }
    .search-btn:hover { background: var(--brand-dark); }
    .search-btn:active { transform: scale(.97); }

    .actions { display: flex; align-items: center; gap: 10px; }
    .icon-btn {
      position: relative; width: 42px; height: 42px; border-radius: 50%;
      border: 1px solid var(--line); background: var(--surface); box-shadow: var(--shadow-sm);
      color: var(--ink); font-size: 1.3rem; line-height: 1; display: grid; place-items: center;
      transition: color .15s ease, border-color .15s ease, transform .12s ease, background-color .2s ease;
    }
    .icon-btn:hover { color: var(--accent); border-color: var(--accent); transform: scale(1.06); }
    .icon-btn.wish { color: var(--sun-deep); background: var(--sun-soft); border-color: var(--sun); }
    .icon-btn.wish:hover { color: var(--sun-deep); background: #fde68a; border-color: var(--sun-deep); }
    .badge { position: absolute; top: -3px; right: -4px; background: var(--accent); color: #fff; font-family: var(--font-body); font-weight: 800; font-size: .68rem; min-width: 18px; height: 18px; border-radius: 999px; display: grid; place-items: center; padding: 0 4px; box-shadow: 0 2px 6px rgba(244, 63, 94, 0.25); }

    /* ---- row 3 ---- */
    .strip { border-top: 1px solid var(--line); background: var(--surface); transition: background-color .2s ease; }
    .strip-inner { display: flex; align-items: center; gap: 22px; height: 42px; overflow-x: auto; scrollbar-width: none; }
    .strip-inner::-webkit-scrollbar { display: none; }
    .strip a { font-size: .87rem; font-weight: 700; color: var(--ink); white-space: nowrap; padding: 3px 0; position: relative; transition: color .15s ease; }
    .strip a:hover { color: var(--brand-dark); }
    .strip a.active { color: var(--brand); }
    .strip a.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 3px; border-radius: 3px; background: var(--brand); }

    .burger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; color: var(--ink); }
    .burger span { width: 22px; height: 3px; background: currentColor; border-radius: 3px; }

    @media (max-width: 1080px) {
      .search-cat { display: none; }
    }
    @media (max-width: 900px) {
      .hide-sm { display: none; }
      .burger { display: flex; padding: 10px 8px; }
      .icon-btn { font-size: 1.4rem; }
      .actions { gap: 8px; }
      .strip a { padding: 13px 0; }
      .utility-inner { height: 38px; }
      .utility a, .linkish { padding: 6px 0; }
      .main-inner { flex-wrap: wrap; height: auto; padding-top: 10px; padding-bottom: 10px; gap: 12px; }
      .search { order: 3; flex-basis: 100%; height: 40px; }
      .search-btn { padding: 0 20px; }
      .brand { margin-right: auto; }
      .logo-img { height: 44px; }
      .strip { display: none; }
      .strip.open { display: block; }
      .strip-inner { flex-direction: column; align-items: flex-start; height: auto; gap: 0; padding-top: 6px; padding-bottom: 6px; }
      .strip a { width: 100%; padding: 11px 0; border-bottom: 1px solid var(--line); }
      .strip a.active::after { display: none; }
    }
  `],
})
export class NavbarComponent implements OnInit {
  menuOpen = signal(false);
  categories = signal<Category[]>([]);
  query = '';
  scope = '';

  constructor(
    public auth: AuthService,
    public cart: CartService,
    public saved: SavedService,
    public themeService: ThemeService,
    private cats: CategoryService,
    private orders: OrderService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cats.list().subscribe((c) => this.categories.set(c || []));
  }

  /** Top-level departments shown in the category strip */
  strip(): Category[] {
    const PREFERRED_ORDER = [
      'electronics',
      'fashion',
      'collectibles-and-art',
      'sports',
      'health-and-beauty',
      'home-and-garden',
    ];
    const allTop = this.categories().filter((c) => !c.parent && !c.parentId);
    const bySlug = new Map(allTop.map((c) => [c.slug, c]));

    const ordered: Category[] = [];
    PREFERRED_ORDER.forEach((slug) => {
      const cat = bySlug.get(slug);
      if (cat) {
        ordered.push(cat);
        bySlug.delete(slug);
      }
    });
    bySlug.forEach((cat) => ordered.push(cat));
    return ordered;
  }

  /** Top-level departments only — the search scope groups sub-categories under these. */
  departments(): Category[] {
    return this.categories().filter((c) => !c.parent && !c.parentId);
  }

  subsOf(parentSlug: string): Category[] {
    return this.categories().filter((c) => c.parent === parentSlug);
  }

  doSearch() {
    this.router.navigate(['/shop'], {
      queryParams: {
        search: this.query.trim() || null,
        category: this.scope || null,
      },
    });
    this.closeAll();
  }

  firstName() { return this.auth.user()?.name?.split(' ')[0] ?? ''; }
  /** Guests still get an orders link once they've placed something. */
  hasGuestOrders() { return !this.auth.isLoggedIn() && this.orders.guestOrders().length > 0; }

  closeAll() { this.menuOpen.set(false); }

  logout() {
    this.auth.logout();
    this.closeAll();
    this.router.navigate(['/']);
  }

  @HostListener('window:resize') onResize() { if (window.innerWidth > 900) this.menuOpen.set(false); }
}
