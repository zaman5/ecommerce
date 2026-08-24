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
          <a routerLink="/account/orders" class="top-item"><i class="fas fa-map-marker-alt text-icon"></i> Track Order</a>
          <a routerLink="/contact" class="top-item"><i class="fas fa-question-circle text-icon"></i> Help</a>

          @if (auth.isAdmin()) { <a routerLink="/admin" class="admin-badge">Admin Panel</a> }
          @if (auth.isShopManager()) { <a routerLink="/shop-manager" class="admin-badge">Shop Panel</a> }
        </div>
      </div>
    </div>

    <!-- MAIN HEADER -->
    <header class="main-header">
      <div class="container header-inner">
        <!-- Mobile Menu Toggle Button -->
        <button class="burger" (click)="toggleMenu()" aria-label="Open menu">
          <i class="fas fa-bars"></i>
        </button>

        <!-- Brand Logo -->
        <a routerLink="/" class="brand" (click)="closeAll()" aria-label="WonderCart Home">
          <img src="assets/WonderCart.png" alt="WonderCart Logo" class="brand-logo-img" />
        </a>

        <!-- Search Bar -->
        <form class="search-bar" (ngSubmit)="doSearch()">
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

    <!-- DESKTOP NAVIGATION BAR WITH CATEGORY DROPDOWN -->
    <nav class="nav-bar hide-mobile">
      <div class="container nav-inner">
        <!-- Categories Dropdown Button -->
        <div class="category-dropdown-wrap">
          <button class="cat-btn" (click)="catDropdown.set(!catDropdown())">
            <div class="cat-btn-left">
              <i class="fas fa-bars"></i>
              <span>All Categories</span>
            </div>
            <i class="fas fa-chevron-down text-xs"></i>
          </button>

          <!-- Dropdown Menu -->
          @if (catDropdown()) {
            <div class="cat-menu-popover">
              @for (dept of departments(); track dept._id) {
                <div class="cat-menu-item group">
                  <a
                    [routerLink]="['/shop']"
                    [queryParams]="{ category: dept.slug }"
                    class="cat-menu-link"
                    (click)="closeAll()"
                  >
                    <span>{{ dept.name }}</span>
                    @if (subsOf(dept.slug).length > 0) {
                      <i class="fas fa-chevron-right text-xs text-muted"></i>
                    }
                  </a>
                  @if (subsOf(dept.slug).length > 0) {
                    <div class="cat-submenu">
                      <div class="cat-submenu-title">{{ dept.name }}</div>
                      @for (sub of subsOf(dept.slug); track sub._id) {
                        <a
                          [routerLink]="['/shop']"
                          [queryParams]="{ category: sub.slug }"
                          class="cat-sub-link"
                          (click)="closeAll()"
                        >
                          {{ sub.name }}
                        </a>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Horizontal Nav Links -->
        <ul class="nav-links">
          <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeAll()">Home</a></li>
          <li><a routerLink="/shop" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeAll()">Shop</a></li>
          <li><a [routerLink]="['/shop']" [queryParams]="{ sort: 'newest' }" (click)="closeAll()">New Arrivals</a></li>
          <li><a [routerLink]="['/shop']" [queryParams]="{ sort: 'popular' }" (click)="closeAll()">Best Sellers</a></li>
          <li><a [routerLink]="['/shop']" [queryParams]="{ deals: 'true' }" class="nav-deal" (click)="closeAll()">🔥 Deals</a></li>
          <li><a routerLink="/terms" fragment="about" (click)="closeAll()">About Us</a></li>
          <li><a routerLink="/contact" (click)="closeAll()">Contact Us</a></li>
        </ul>
      </div>
    </nav>

    <!-- MOBILE SLIDE-OUT DRAWER -->
    @if (menuOpen()) {
      <div class="drawer-backdrop" (click)="closeAll()"></div>
      <aside class="mobile-drawer" [class.open]="menuOpen()">
        <!-- Drawer Header -->
        <div class="drawer-head">
          <a routerLink="/" class="brand" (click)="closeAll()">
            <img src="assets/WonderCart.png" alt="WonderCart" class="drawer-logo" />
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
    .main-header { background: var(--surface); padding: 12px 0; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header-inner { display: flex; align-items: center; justify-content: space-between; gap: 18px; }

    .brand { display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
    .brand-logo-img { height: 56px; width: auto; object-fit: contain; transition: transform 0.2s ease; }
    .brand:hover .brand-logo-img { transform: scale(1.04); }

    /* Search Bar */
    .search-bar { flex: 1; max-width: 600px; position: relative; display: flex; align-items: center; }
    .search-input { width: 100%; padding: 10px 48px 10px 18px; border-radius: 999px; border: 1px solid var(--line); background: var(--cream-deep); font-family: var(--font-body); font-size: 0.88rem; color: var(--ink); outline: none; transition: border-color .15s, box-shadow .15s; }
    .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--brand-glow); background: var(--surface); }
    .search-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--muted); font-size: 1rem; cursor: pointer; padding: 6px; transition: color .15s; }
    .search-btn:hover { color: var(--primary); }

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

    /* DESKTOP NAVIGATION BAR */
    .nav-bar { background: var(--surface); border-bottom: 1px solid var(--line); padding: 8px 0; }
    .nav-inner { display: flex; align-items: center; gap: 28px; }

    .category-dropdown-wrap { position: relative; }
    .cat-btn {
      background: var(--primary);
      color: #ffffff;
      padding: 10px 22px;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.92rem;
      border: none;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(30, 58, 138, 0.2);
      transition: transform .15s, background .15s, box-shadow .15s;
    }
    .cat-btn:hover {
      background: #172554;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(30, 58, 138, 0.3);
    }
    .cat-btn-left { display: inline-flex; align-items: center; gap: 8px; }

    .cat-menu-popover {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 260px;
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      z-index: 55;
      border-radius: 14px;
      overflow: hidden;
    }
    .cat-menu-item { position: relative; }
    .cat-menu-link { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; font-size: 0.88rem; font-weight: 600; color: var(--ink); text-decoration: none; transition: background .15s, color .15s; border-bottom: 1px solid rgba(0,0,0,0.03); }
    .cat-menu-link:hover, .cat-menu-item:hover > .cat-menu-link { background: var(--cream-deep); color: var(--primary); }

    /* Submenu flyout */
    .cat-submenu { display: none; position: absolute; left: 100%; top: 0; width: 240px; background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow-lg); border-radius: var(--radius-sm); padding: 8px 0; z-index: 60; }
    .cat-menu-item:hover .cat-submenu { display: block; }
    .cat-submenu-title { font-family: var(--font-display); font-weight: 800; font-size: 0.82rem; color: var(--muted); text-transform: uppercase; padding: 6px 16px 4px; border-bottom: 1px solid var(--line); margin-bottom: 4px; }
    .cat-sub-link { display: block; padding: 7px 16px; font-size: 0.85rem; color: var(--ink); text-decoration: none; }
    .cat-sub-link:hover { background: var(--cream-deep); color: var(--primary); }

    /* Nav Links */
    .nav-links { display: flex; list-style: none; margin: 0; padding: 0; gap: 24px; }
    .nav-links li a { display: block; padding: 10px 0; font-size: 0.9rem; font-weight: 600; color: var(--ink); text-decoration: none; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; }
    .nav-links li a:hover, .nav-links li a.active { color: var(--primary); border-bottom-color: var(--primary); }
    .nav-deal { color: #e11d48 !important; }

    .burger { display: none; background: none; border: none; font-size: 1.35rem; color: var(--ink); cursor: pointer; padding: 6px 8px; border-radius: 8px; }
    .burger:hover { background: var(--cream-deep); }

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
      .nav-inner { justify-content: space-between; }
      .cat-btn { width: 180px; padding: 10px 14px; font-size: 0.85rem; }
      .nav-links { gap: 16px; font-size: 0.85rem; }
    }

    @media (max-width: 768px) {
      .burger { display: block; }
      .hide-mobile { display: none !important; }
      .search-bar { max-width: none; order: 3; flex-basis: 100%; margin-top: 8px; }
      .header-inner { flex-wrap: wrap; gap: 10px 14px; }
      .top-welcome { font-size: 0.72rem; }
      .brand-logo-img { height: 46px; }
      .header-actions { gap: 10px; }
      .action-circle { width: 36px; height: 36px; font-size: 1rem; }
    }
  `],
})
export class NavbarComponent implements OnInit {
  menuOpen = signal(false);
  catDropdown = signal(false);
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
    this.router.navigate(['/shop'], {
      queryParams: {
        search: this.query.trim() || null,
      },
    });
    this.closeAll();
  }

  firstName() {
    return this.auth.user()?.name?.split(' ')[0] ?? '';
  }

  closeAll() {
    this.menuOpen.set(false);
    this.catDropdown.set(false);
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
    if (!target.closest('.category-dropdown-wrap')) {
      this.catDropdown.set(false);
    }
    if (!target.closest('.action-item')) {
      this.accountDropdown.set(false);
    }
  }
}

