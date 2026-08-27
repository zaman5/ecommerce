import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { SavedService } from '../../core/services/saved.service';
import { CategoryService } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { Category } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <!-- TOP UTILITY BAR -->
    <div class="top-bar">
      <div class="container top-bar-inner">
        <div class="top-welcome">Welcome to WonderCart - Everything Kids Love!</div>
        <div class="top-links">
          <span class="top-item hide-md"><i class="fas fa-truck text-icon"></i> Fast &amp; Reliable Delivery</span>
          <span class="top-item hide-md"><i class="fas fa-shield-alt text-icon"></i> Secure Payments</span>
          <span class="top-item hide-md"><i class="fas fa-undo text-icon"></i> Easy Returns</span>
          <a routerLink="/contact" class="top-item"><i class="fas fa-question-circle text-icon"></i> Help</a>

          @if (auth.isAdmin()) { <a routerLink="/admin" class="admin-badge">Admin Panel</a> }
          @if (auth.isShopManager()) { <a routerLink="/shop-manager" class="admin-badge">Shop Panel</a> }
        </div>
      </div>
    </div>

    <!-- MAIN HEADER -->
    <header class="main-header">
      <div class="container header-inner">
        <!-- Brand Logo -->
        <a routerLink="/" class="brand" (click)="closeAll()" aria-label="WonderCart Home">
          <img src="assets/WonderCart.png?v=20260824" alt="WonderCart Logo" class="brand-logo-img" />
        </a>

        <!-- Search Bar with Category Selector -->
        <form class="search-bar" (ngSubmit)="doSearch()">
          <div class="search-cat-wrap">
            <select
              name="cat"
              [(ngModel)]="selectedCategory"
              (change)="onCategoryChange()"
              class="search-cat-select"
              aria-label="Select Category"
            >
              <option value="">All Categories</option>
              @for (dept of departments(); track dept._id) {
                <option [value]="dept.slug">{{ dept.name }}</option>
              }
            </select>
            <i class="fas fa-chevron-down search-cat-arrow"></i>
          </div>

          <input
            class="search-input"
            type="search"
            name="q"
            [(ngModel)]="query"
            placeholder="Search toys, school essentials, lunch boxes..."
            aria-label="Search products"
          />
          <button class="search-btn" type="submit" aria-label="Search">
            <i class="fas fa-search"></i>
          </button>
        </form>

        <!-- Actions: Account, Wishlist, Cart -->
        <div class="header-actions">
          <!-- Account Dropdown (Desktop) -->
          @if (auth.isLoggedIn()) {
            <div class="action-item group" (click)="accountDropdown.set(!accountDropdown())">
              <div class="action-circle">
                <i class="far fa-user"></i>
              </div>
              <div class="action-text">
                <span class="action-sub">Hi, {{ firstName() }}</span>
                <span class="action-main">Account ▾</span>
              </div>
              @if (accountDropdown()) {
                <div class="dropdown-popover">
                  <a routerLink="/account/orders" (click)="closeAll()">📦 My Orders</a>
                  @if (auth.isAdmin()) { <a routerLink="/admin" (click)="closeAll()">📊 Admin Dashboard</a> }
                  @if (auth.isShopManager()) { <a routerLink="/shop-manager" (click)="closeAll()">👥 Shop Manager</a> }
                  <button class="dropdown-link-btn" (click)="logout()">🚪 Sign Out</button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/login" class="action-item">
              <div class="action-circle">
                <i class="far fa-user"></i>
              </div>
              <div class="action-text">
                <span class="action-sub">Account</span>
                <span class="action-main">Sign In</span>
              </div>
            </a>
          }

          <!-- Wishlist -->
          <a routerLink="/saved" class="action-item relative" aria-label="Wishlist">
            <div class="action-circle">
              <i class="far fa-heart"></i>
              @if (saved.count() > 0) {
                <span class="bubble-badge bg-accent">{{ saved.count() }}</span>
              }
            </div>
            <div class="action-text">
              <span class="action-sub">Wishlist</span>
            </div>
          </a>

          <!-- Cart -->
          <a routerLink="/cart" class="action-item relative" aria-label="Shopping Cart">
            <div class="action-circle">
              <i class="fas fa-shopping-cart"></i>
              @if (cart.count() > 0) {
                <span class="bubble-badge bg-primary">{{ cart.count() }}</span>
              }
            </div>
            <div class="action-text">
              <span class="action-sub">Cart</span>
            </div>
          </a>
        </div>
      </div>
    </header>

    <!-- MOBILE SLIDE-OUT DRAWER -->
    @if (menuOpen()) {
      <div class="drawer-backdrop" (click)="closeAll()"></div>
      <aside class="mobile-drawer" [class.open]="menuOpen()">
        <!-- Drawer Header -->
        <div class="drawer-head">
          <a routerLink="/" class="brand" (click)="closeAll()">
            <img src="assets/WonderCart.png?v=20260824" alt="WonderCart" class="drawer-logo" />
          </a>
          <button class="drawer-close-btn" (click)="closeAll()" aria-label="Close navigation menu">✕</button>
        </div>

        <!-- Drawer User Card -->
        <div class="drawer-user-box">
          @if (auth.isLoggedIn()) {
            <div class="drawer-user-info">
              <div class="drawer-avatar">👤</div>
              <div>
                <strong>Hi, {{ firstName() }}</strong>
                <span class="text-muted text-xs">{{ auth.user()?.email }}</span>
              </div>
            </div>
            <div class="drawer-user-actions">
              <a routerLink="/account/orders" class="drawer-user-btn" (click)="closeAll()">📦 My Orders</a>
              <button class="drawer-user-btn text-danger" (click)="logout()">🚪 Sign Out</button>
            </div>
          } @else {
            <div class="drawer-guest-box">
              <span>Welcome to WonderCart</span>
              <div class="drawer-auth-btns">
                <a routerLink="/login" class="btn btn-primary btn-sm btn-block" (click)="closeAll()">Sign In</a>
                <a routerLink="/register" class="btn btn-ghost btn-sm btn-block" (click)="closeAll()">Create Account</a>
              </div>
            </div>
          }
        </div>

        <!-- Drawer Navigation List -->
        <div class="drawer-body">
          <div class="drawer-nav-section">
            <h4 class="drawer-section-title">Navigation</h4>
            <ul class="drawer-links">
              <li><a routerLink="/" (click)="closeAll()"><i class="fas fa-home"></i> Home</a></li>
              <li><a routerLink="/shop" (click)="closeAll()"><i class="fas fa-store"></i> Shop All</a></li>
              <li><a [routerLink]="['/shop']" [queryParams]="{ sort: 'newest' }" (click)="closeAll()"><i class="fas fa-sparkles"></i> New Arrivals</a></li>
              <li><a [routerLink]="['/shop']" [queryParams]="{ sort: 'popular' }" (click)="closeAll()"><i class="fas fa-star"></i> Best Sellers</a></li>
              <li><a [routerLink]="['/shop']" [queryParams]="{ deals: 'true' }" class="nav-deal" (click)="closeAll()"><i class="fas fa-fire"></i> Hot Deals</a></li>
              <li><a routerLink="/saved" (click)="closeAll()"><i class="fas fa-heart"></i> Wishlist ({{ saved.count() }})</a></li>
              <li><a routerLink="/cart" (click)="closeAll()"><i class="fas fa-shopping-cart"></i> Cart ({{ cart.count() }})</a></li>
            </ul>
          </div>

          <!-- Drawer Categories Accordion -->
          <div class="drawer-nav-section">
            <h4 class="drawer-section-title">Categories</h4>
            <div class="drawer-cats">
              @for (dept of departments(); track dept._id) {
                <div class="drawer-cat-group">
                  <div class="drawer-cat-row">
                    <a [routerLink]="['/shop']" [queryParams]="{ category: dept.slug }" class="drawer-cat-name" (click)="closeAll()">
                      {{ dept.name }}
                    </a>
                    @if (subsOf(dept.slug).length > 0) {
                      <button class="drawer-cat-toggle" (click)="toggleDeptExpand(dept.slug)">
                        {{ isDeptExpanded(dept.slug) ? '−' : '+' }}
                      </button>
                    }
                  </div>
                  @if (isDeptExpanded(dept.slug) && subsOf(dept.slug).length > 0) {
                    <div class="drawer-sub-list">
                      @for (sub of subsOf(dept.slug); track sub._id) {
                        <a [routerLink]="['/shop']" [queryParams]="{ category: sub.slug }" class="drawer-sub-item" (click)="closeAll()">
                          {{ sub.name }}
                        </a>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Quick Customer Service Links -->
          <div class="drawer-nav-section">
            <h4 class="drawer-section-title">Support &amp; Quick Links</h4>
            <ul class="drawer-links">
              <li><a routerLink="/account/orders" (click)="closeAll()"><i class="fas fa-map-marker-alt"></i> Track Order</a></li>
              <li><a routerLink="/contact" (click)="closeAll()"><i class="fas fa-question-circle"></i> Contact &amp; Help</a></li>
              <li><a routerLink="/terms" fragment="about" (click)="closeAll()"><i class="fas fa-info-circle"></i> About WonderCart</a></li>
              @if (auth.isAdmin()) {
                <li><a routerLink="/admin" class="text-primary font-bold" (click)="closeAll()"><i class="fas fa-tachometer-alt"></i> Admin Panel</a></li>
              }
              @if (auth.isShopManager()) {
                <li><a routerLink="/shop-manager" class="text-primary font-bold" (click)="closeAll()"><i class="fas fa-store-alt"></i> Shop Manager Panel</a></li>
              }
            </ul>
          </div>
        </div>
      </aside>
    }
  `,
  styles: [`
    /* TOP UTILITY BAR */
    .top-bar { background: var(--cream-deep); border-bottom: 1px solid var(--line); font-size: 0.76rem; color: var(--muted); padding: 6px 0; }
    .top-bar-inner { display: flex; justify-content: space-between; align-items: center; }
    .top-welcome { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .top-links { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .top-item { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); text-decoration: none; font-weight: 500; transition: color .15s; white-space: nowrap; }
    .top-item:hover { color: var(--primary); }
    .text-icon { color: #9ca3af; font-size: 0.85rem; }
    .admin-badge { background: var(--primary); color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.72rem; }

    /* MAIN HEADER */
    .main-header {
      background: var(--surface);
      padding: 12px 0;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      width: 100%;
      box-sizing: border-box;
    }
    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .brand { display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
    .brand-logo-img { height: 56px; width: auto; object-fit: contain; transition: transform 0.2s ease; }
    .brand:hover .brand-logo-img { transform: scale(1.04); }

    /* Search Bar with Category Selector */
    .search-bar {
      flex: 1 1 auto;
      max-width: 640px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      background: var(--cream-deep);
      border: 1.5px solid var(--line);
      border-radius: 999px;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .search-bar:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--brand-glow);
      background: var(--surface);
    }

    .search-cat-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      max-width: 40%;
    }
    .search-cat-select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background: transparent;
      border: none;
      border-right: 1px solid var(--line);
      padding: 9px 28px 9px 16px;
      font-family: var(--font-body);
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--ink);
      cursor: pointer;
      outline: none;
      border-radius: 999px 0 0 999px;
      max-width: 145px;
      width: 100%;
      box-sizing: border-box;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: color .15s, background .15s;
    }
    .search-cat-select:hover {
      background: rgba(30, 58, 138, 0.04);
      color: var(--primary);
    }
    .search-cat-select option {
      background: var(--surface);
      color: var(--ink);
      font-weight: 600;
      padding: 8px;
    }
    .search-cat-arrow {
      position: absolute;
      right: 10px;
      pointer-events: none;
      font-size: 0.62rem;
      color: var(--muted);
    }

    .search-input {
      flex: 1 1 0%;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
      padding: 9px 42px 9px 12px;
      border: none;
      background: transparent;
      font-family: var(--font-body);
      font-size: 0.88rem;
      color: var(--ink);
      outline: none;
    }
    .search-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: var(--primary);
      border: none;
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s, transform .12s;
    }
    .search-btn:hover {
      background: #172554;
      transform: translateY(-50%) scale(1.05);
    }

    /* Actions */
    .header-actions { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
    .action-item { display: flex; align-items: center; gap: 8px; text-decoration: none; cursor: pointer; position: relative; }
    .action-circle { width: 40px; height: 40px; border-radius: 50%; background: var(--cream-deep); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: var(--ink); transition: background .15s, color .15s; position: relative; }
    .action-item:hover .action-circle { background: var(--primary); color: #ffffff; }
    .action-text { display: flex; flex-direction: column; font-size: 0.78rem; line-height: 1.2; }
    .action-sub { color: var(--muted); font-size: 0.72rem; }
    .action-main { font-weight: 700; color: var(--ink); }
    .bubble-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      font-size: 0.65rem;
      font-weight: 800;
      color: #ffffff;
      padding: 1px 5px;
      border-radius: 999px;
      min-width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      line-height: 1;
    }
    .bubble-badge.bg-primary { background: var(--primary); }
    .bubble-badge.bg-accent { background: var(--accent); }

    /* Dropdown Popover */
    .dropdown-popover { position: absolute; top: calc(100% + 10px); right: 0; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); padding: 8px 0; min-width: 180px; z-index: 60; }
    .dropdown-popover a, .dropdown-link-btn { display: block; width: 100%; text-align: left; padding: 8px 16px; font-size: 0.85rem; color: var(--ink); text-decoration: none; background: none; border: none; cursor: pointer; }
    .dropdown-popover a:hover, .dropdown-link-btn:hover { background: var(--cream-deep); color: var(--primary); }

    /* ================= MOBILE SLIDE-OUT DRAWER ================= */
    .drawer-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(2px);
      z-index: 100; animation: fadeIn .2s ease-out;
    }
    .mobile-drawer {
      position: fixed; top: 0; left: 0; bottom: 0; width: min(340px, 85vw);
      background: var(--surface); z-index: 101; box-shadow: 0 25px 50px rgba(0,0,0,0.25);
      display: flex; flex-direction: column; animation: slideIn .22s ease-out; overflow: hidden;
    }
    @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .drawer-head {
      display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
      border-bottom: 1px solid var(--line); background: var(--cream-deep); flex-shrink: 0;
    }
    .drawer-logo { height: 44px; width: auto; object-fit: contain; }
    .drawer-close-btn {
      background: none; border: none; font-size: 1.3rem; color: var(--ink);
      cursor: pointer; padding: 6px 10px; border-radius: 6px; line-height: 1;
    }
    .drawer-close-btn:hover { background: rgba(0,0,0,0.06); color: var(--accent); }

    .drawer-user-box { padding: 16px 20px; border-bottom: 1px solid var(--line); background: var(--surface); flex-shrink: 0; }
    .drawer-user-info { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .drawer-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--cream-deep); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
    .drawer-user-actions { display: flex; gap: 10px; }
    .drawer-user-btn { flex: 1; padding: 7px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; border: 1px solid var(--line); background: var(--cream-deep); color: var(--ink); text-align: center; cursor: pointer; text-decoration: none; }
    .drawer-guest-box { display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem; font-weight: 600; }
    .drawer-auth-btns { display: flex; gap: 8px; }

    .drawer-body { padding: 16px 20px; overflow-y: auto; flex: 1; min-height: 0; -webkit-overflow-scrolling: touch; }
    .drawer-nav-section { margin-bottom: 24px; }
    .drawer-section-title {
      font-family: var(--font-display); font-size: 0.76rem; font-weight: 800;
      color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;
    }
    .drawer-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .drawer-links a {
      display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px;
      font-size: 0.9rem; font-weight: 600; color: var(--ink); text-decoration: none; transition: background .12s;
    }
    .drawer-links a:hover { background: var(--cream-deep); color: var(--primary); }

    /* Drawer Categories Accordion */
    .drawer-cats { display: flex; flex-direction: column; gap: 4px; }
    .drawer-cat-group { border-radius: 8px; overflow: hidden; }
    .drawer-cat-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--cream-deep); border-radius: 8px; margin-bottom: 2px; }
    .drawer-cat-name { font-size: 0.88rem; font-weight: 700; color: var(--ink); text-decoration: none; flex: 1; }
    .drawer-cat-toggle { background: none; border: none; font-size: 1.2rem; font-weight: 700; color: var(--muted); cursor: pointer; padding: 2px 8px; line-height: 1; }
    .drawer-sub-list { padding: 4px 0 8px 16px; display: flex; flex-direction: column; gap: 2px; }
    .drawer-sub-item { display: block; padding: 6px 12px; font-size: 0.84rem; color: var(--muted); text-decoration: none; border-radius: 6px; }
    .drawer-sub-item:hover { color: var(--primary); background: var(--cream-deep); }

    @media (max-width: 960px) {
      .hide-md { display: none; }
      .action-text { display: none; }
    }

    @media (max-width: 768px) {
      .main-header { padding: 10px 0; }
      .header-inner {
        flex-wrap: wrap;
        justify-content: space-between;
        row-gap: 8px;
        column-gap: 12px;
      }
      .search-bar {
        width: 100%;
        max-width: 100%;
        order: 3;
        flex: 1 1 100%;
        margin-top: 4px;
      }
      .search-cat-wrap { max-width: 38%; }
      .search-cat-select {
        padding: 8px 22px 8px 10px;
        font-size: 0.78rem;
        max-width: 110px;
      }
      .search-cat-arrow { right: 6px; font-size: 0.55rem; }
      .search-input {
        padding: 8px 36px 8px 10px;
        font-size: 0.82rem;
      }
      .search-btn {
        width: 28px;
        height: 28px;
        font-size: 0.8rem;
        right: 5px;
      }
      .top-welcome { font-size: 0.72rem; }
      .brand-logo-img { height: 40px; max-width: 150px; }
      .header-actions { gap: 8px; }
      .action-circle { width: 36px; height: 36px; font-size: 0.95rem; }
    }

    @media (max-width: 480px) {
      .top-bar-inner { justify-content: center; }
      .top-welcome { display: none; }
      .brand-logo-img { height: 34px; max-width: 120px; }
      .search-cat-wrap { max-width: 40%; }
      .search-cat-select {
        padding: 7px 18px 7px 8px;
        font-size: 0.74rem;
        max-width: 90px;
      }
      .search-cat-arrow { right: 5px; font-size: 0.5rem; }
      .search-input {
        padding: 7px 32px 7px 8px;
        font-size: 0.78rem;
      }
      .search-btn {
        width: 26px;
        height: 26px;
        font-size: 0.74rem;
        right: 4px;
      }
      .action-circle { width: 32px; height: 32px; font-size: 0.88rem; }
      .bubble-badge { top: -4px; right: -4px; font-size: 0.6rem; min-width: 16px; height: 16px; padding: 0 4px; }
      .header-inner { row-gap: 6px; column-gap: 8px; }
      .search-bar { margin-top: 2px; }
    }
  `],
})
export class NavbarComponent implements OnInit {
  menuOpen = signal(false);
  selectedCategory = '';
  accountDropdown = signal(false);
  categories = signal<Category[]>([]);
  expandedDepts = signal<Set<string>>(new Set());
  query = '';

  constructor(
    public auth: AuthService,
    public cart: CartService,
    public saved: SavedService,
    public themeService: ThemeService,
    private cats: CategoryService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cats.list().subscribe((c) => this.categories.set(c || []));
  }

  onCategoryChange() {
    if (!this.query.trim()) {
      if (this.selectedCategory) {
        this.router.navigate(['/shop'], {
          queryParams: { category: this.selectedCategory },
        });
      } else {
        this.router.navigate(['/shop']);
      }
      this.closeAll();
    }
  }

  departments(): Category[] {
    return this.categories().filter((c) => !c.parent && !c.parentId);
  }

  subsOf(parentSlug: string): Category[] {
    return this.categories().filter((c) => c.parent === parentSlug);
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  toggleDeptExpand(slug: string) {
    const current = new Set(this.expandedDepts());
    if (current.has(slug)) {
      current.delete(slug);
    } else {
      current.add(slug);
    }
    this.expandedDepts.set(current);
  }

  isDeptExpanded(slug: string): boolean {
    return this.expandedDepts().has(slug);
  }

  doSearch() {
    const params: Record<string, string | null> = {
      search: this.query.trim() || null,
    };
    if (this.selectedCategory) {
      params['category'] = this.selectedCategory;
    }
    this.router.navigate(['/shop'], {
      queryParams: params,
    });
    this.closeAll();
  }

  firstName() {
    return this.auth.user()?.name?.split(' ')[0] ?? '';
  }

  closeAll() {
    this.menuOpen.set(false);
    this.accountDropdown.set(false);
  }

  logout() {
    this.auth.logout();
    this.closeAll();
    this.router.navigate(['/']);
  }

  @HostListener('window:resize') onResize() {
    if (window.innerWidth > 768) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.action-item')) {
      this.accountDropdown.set(false);
    }
  }
}
