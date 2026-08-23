import { Component, HostListener, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FlashSaleService, ProductService, CategoryService, BannerService } from '../../core/services/api.service';
import { Banner, Category, FlashSale, Product } from '../../core/models/models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { ProductRailComponent } from '../../shared/components/product-rail.component';
import { HeroBannerComponent } from '../../shared/components/hero-banner.component';

const PAGE_SIZE = 20;
const ROWS_SHOWN = 2;
const DEFAULT_COLS = 4;

interface VisualCategory {
  name: string;
  sub: string;
  slug: string;
  icon: string;
  bgClass: string;
  iconColor: string;
  emoji?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ProductRailComponent, HeroBannerComponent],
  template: `
    <!-- ================= 1. HERO SECTION ================= -->
    <section class="hero-section">
      <!-- Decorative Floating Elements -->
      <div class="decor-star star-1">⭐</div>
      <div class="decor-star star-2">✨</div>
      <div class="decor-cloud cloud-1">☁️</div>

      <div class="container hero-container">
        <!-- Hero Left Copy -->
        <div class="hero-left">
          <div class="hero-badge">
            From Newborn to 18 Years
          </div>
          <h1 class="hero-title font-nunito">
            Everything <br />
            <span class="hero-title-accent">Kids Love!</span>
          </h1>
          <p class="hero-subhead">One Stop. Every Need. Every Age.</p>
          <p class="hero-desc">
            Explore a wide range of quality products for your little ones — toys, school essentials, lunch boxes, water bottles and much more!
          </p>
          <div class="hero-cta-row">
            <a routerLink="/shop" class="btn-hero-cta">
              Shop Now <i class="fas fa-shopping-bag"></i>
            </a>
          </div>
          <!-- Trust Checkmarks -->
          <div class="hero-trust-row">
            <span class="trust-item"><i class="far fa-check-circle text-primary"></i> Quality You Can Trust</span>
            <span class="trust-item"><i class="fas fa-tags text-primary"></i> Affordable Prices</span>
            <span class="trust-item"><i class="far fa-heart text-accent"></i> Loved by Parents</span>
          </div>
        </div>

        <!-- Hero Right Composition / Banner -->
        <div class="hero-right">
          <div class="hero-banner-wrapper">
            <app-hero-banner />
          </div>
        </div>
      </div>
    </section>

    <!-- ================= 2. SHOP BY CATEGORY ================= -->
    <section class="category-section">
      <div class="container">
        <div class="section-heading-center">
          <h2 class="font-nunito section-title">
            Shop by Category <span class="heading-emoji">🍬</span>
          </h2>
        </div>

        <div class="category-grid">
          @for (cat of visualCategories; track cat.slug) {
            <a [routerLink]="['/shop']" [queryParams]="{ category: cat.slug }" class="cat-circle-card group">
              <div class="cat-circle-avatar" [ngClass]="cat.bgClass">
                @if (cat.emoji) {
                  <span class="cat-circle-emoji">{{ cat.emoji }}</span>
                } @else {
                  <i [class]="cat.icon" [style.color]="cat.iconColor"></i>
                }
              </div>
              <h3 class="cat-circle-title">{{ cat.name }}</h3>
              <p class="cat-circle-sub">{{ cat.sub }}</p>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- ================= 3. FLASH SALE / POPULAR PICKS ================= -->
    @if (showFlash() && deals().length) {
      <section class="popular-section">
        <div class="container">
          <div class="section-heading-between">
            <div class="heading-left">
              <h2 class="font-nunito section-title">{{ flash()!.title || 'Flash Sale' }}</h2>
              @if (flash()!.countdownMode !== 'none') {
                <div class="flash-timer-badge">
                  <span>{{ flash()!.timerLabel || 'Ends in:' }}</span>
                  <b>{{ countdown() }}</b>
                </div>
              }
            </div>
            @if (flash()!.ctaLabel) {
              <a [routerLink]="ctaRoute()" [queryParams]="ctaParams()" class="see-all-link">{{ flash()!.ctaLabel }} ›</a>
            }
          </div>
          <app-product-rail [products]="deals()" />
        </div>
      </section>
    }

    <!-- POPULAR PICKS -->
    <section class="popular-section" [class.bg-alt]="!showFlash()">
      <div class="container">
        <div class="section-heading-between">
          <div class="heading-left">
            <h2 class="font-nunito section-title">Popular Picks <i class="fas fa-star text-secondary text-xl"></i></h2>
          </div>
          <a routerLink="/shop" class="see-all-link">See All ›</a>
        </div>
        @if (featured().length) {
          <app-product-rail [products]="featured()" />
        }
      </div>
    </section>

    <!-- ================= 4. FEATURES STRIP ================= -->
    <section class="features-strip">
      <div class="container">
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon-circle">
              <i class="fas fa-truck-fast"></i>
            </div>
            <div>
              <h4 class="feature-title">Fast &amp; Reliable Delivery</h4>
              <p class="feature-desc">On time, every time</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon-circle">
              <i class="fas fa-shield-alt"></i>
            </div>
            <div>
              <h4 class="feature-title">Secure Payments</h4>
              <p class="feature-desc">100% safe &amp; secure</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon-circle">
              <i class="fas fa-box-open"></i>
            </div>
            <div>
              <h4 class="feature-title">Easy Returns</h4>
              <p class="feature-desc">Hassle free returns</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon-circle">
              <i class="fas fa-headset"></i>
            </div>
            <div>
              <h4 class="feature-title">Customer Support</h4>
              <p class="feature-desc">We're here to help</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= 5. OPENING SALE BANNER ================= -->
    <section class="promo-banner-section">
      <div class="container">
        <div class="promo-banner-card">
          <!-- Background Floating Decor -->
          <div class="decor-star" style="top: 15px; right: 25%;">⭐</div>
          <div class="decor-star" style="bottom: 15px; right: 35%;">✨</div>
          <div class="decor-cloud" style="top: 10px; right: 8%;">☁️</div>

          <div class="promo-left">
            <div class="promo-img-wrap">
              <i class="fas fa-gift promo-big-icon"></i>
            </div>
            <div class="promo-center-text">
              <h2 class="font-nunito promo-title">OPENING SALE!</h2>
              <div class="promo-pill">UP TO 30% OFF</div>
              <p class="promo-sub">On All Products</p>
            </div>
          </div>

          <!-- Glassmorphic Discount Box -->
          <div class="promo-glass-box">
            <span class="glass-sub">FIRST 25 CUSTOMERS</span>
            <span class="glass-mid">GET ADDITIONAL</span>
            <span class="glass-bold font-nunito">10% OFF!</span>
            <a routerLink="/shop" [queryParams]="{ deals: 'true' }" class="btn-promo-cta">
              Shop Now
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= 6. JUST FOR YOU FEED ================= -->
    <section class="jfy-section">
      <div class="container">
        <div class="jfy-head-wrap">
          <h2 class="font-nunito jfy-title">Just For You</h2>
        </div>

        @if (loading()) {
          <div class="spinner"></div>
        } @else {
          <div class="dense-product-grid">
            @for (p of visibleFeed(); track p._id) {
              <app-product-card [product]="p" [dense]="true" />
            }
          </div>

          @if (loadingMore()) {
            <div class="spinner"></div>
          }
          @if (hasMore()) {
            <div class="load-more-wrap">
              <button class="btn btn-ghost load-more-btn" [disabled]="loadingMore()" (click)="loadMore()">
                {{ loadingMore() ? 'Loading…' : 'Load More Products' }}
              </button>
            </div>
          } @else if (visibleFeed().length) {
            <p class="feed-end-msg">You've reached the end — {{ visibleFeed().length }} products shown.</p>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    /* ================= 1. HERO SECTION ================= */
    .hero-section {
      background: #fef9f1;
      padding: 48px 0 64px;
      position: relative;
      overflow: hidden;
    }
    .hero-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
    }
    .hero-left { flex: 1; max-width: 580px; z-index: 2; }
    .hero-badge {
      display: inline-block;
      background: var(--secondary);
      color: var(--primary);
      font-weight: 800;
      font-size: 0.82rem;
      padding: 6px 16px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }
    .hero-title {
      font-size: clamp(2.4rem, 4.5vw, 3.8rem);
      font-weight: 900;
      color: var(--primary);
      line-height: 1.1;
      margin: 0 0 16px;
    }
    .hero-title-accent {
      color: #10b981;
      text-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    }
    .hero-subhead {
      font-size: 1.2rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 12px;
    }
    .hero-desc {
      font-size: 0.95rem;
      color: #4b5563;
      line-height: 1.6;
      margin: 0 0 28px;
      max-width: 480px;
    }
    .hero-cta-row { margin-bottom: 32px; }
    .btn-hero-cta {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--primary);
      color: #ffffff;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.05rem;
      padding: 14px 34px;
      border-radius: 999px;
      text-decoration: none;
      box-shadow: 0 8px 20px rgba(30, 58, 138, 0.25);
      transition: transform .15s, background .15s, box-shadow .15s;
    }
    .btn-hero-cta:hover {
      background: #172554;
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(30, 58, 138, 0.35);
    }

    .hero-trust-row {
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 0.82rem;
      color: #4b5563;
      font-weight: 600;
      flex-wrap: wrap;
    }
    .trust-item { display: inline-flex; align-items: center; gap: 6px; }

    .hero-right { flex: 1; max-width: 580px; width: 100%; z-index: 2; }
    .hero-banner-wrapper { width: 100%; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.08); }

    /* Floating Decor */
    .decor-star { position: absolute; font-size: 1.5rem; opacity: 0.6; pointer-events: none; }
    .star-1 { top: 20px; left: 30px; animation: floatSlow 4s ease-in-out infinite alternate; }
    .star-2 { top: 60px; right: 40%; animation: floatSlow 5s ease-in-out infinite alternate; }
    .decor-cloud { position: absolute; font-size: 2.2rem; opacity: 0.4; pointer-events: none; }
    .cloud-1 { top: 30px; right: 50px; }

    @keyframes floatSlow {
      from { transform: translateY(0); }
      to { transform: translateY(-10px); }
    }

    /* ================= 2. SHOP BY CATEGORY ================= */
    .category-section { padding: 56px 0; background: #ffffff; }
    .section-heading-center { text-align: center; margin-bottom: 36px; }
    .section-title { font-size: 1.85rem; font-weight: 800; color: var(--primary); margin: 0; display: inline-flex; align-items: center; gap: 8px; }
    .heading-emoji { font-size: 1.5rem; }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 20px;
      text-align: center;
    }
    .cat-circle-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      padding: 12px 6px;
      transition: transform .2s ease;
    }
    .cat-circle-card:hover { transform: translateY(-4px); }

    .cat-circle-avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.2rem;
      margin-bottom: 12px;
      border: 4px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .cat-circle-emoji {
      font-size: 2.4rem;
      line-height: 1;
      display: inline-block;
      transition: transform .2s ease;
    }
    .cat-circle-card:hover .cat-circle-avatar {
      transform: scale(1.08);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
    }
    .cat-circle-card:hover .cat-circle-emoji {
      transform: scale(1.12);
    }
    .cat-circle-title {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 0.88rem;
      color: #1f2937;
      margin: 0 0 2px;
      line-height: 1.2;
    }
    .cat-circle-sub { font-size: 0.72rem; color: #9ca3af; margin: 0; }

    /* ================= 3. FLASH SALE / POPULAR ================= */
    .popular-section { padding: 48px 0; background: #ffffff; }
    .popular-section.bg-alt { background: #f9fafb; }
    .section-heading-between { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .heading-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .flash-timer-badge { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #6b7280; font-weight: 600; }
    .flash-timer-badge b { background: var(--primary); color: #ffffff; padding: 4px 10px; border-radius: 6px; font-family: var(--font-display); font-size: 0.88rem; }
    .see-all-link { color: var(--primary); font-weight: 700; font-size: 0.9rem; text-decoration: none; }
    .see-all-link:hover { text-decoration: underline; }

    /* ================= 4. FEATURES STRIP ================= */
    .features-strip { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 32px 0; background: #ffffff; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
    .feature-item { display: flex; align-items: center; gap: 16px; }
    .feature-icon-circle { width: 48px; height: 48px; border-radius: 50%; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: var(--primary); flex: none; }
    .feature-title { font-weight: 700; font-size: 0.88rem; color: #1f2937; margin: 0 0 2px; }
    .feature-desc { font-size: 0.75rem; color: #6b7280; margin: 0; }

    /* ================= 5. OPENING SALE PROMO ================= */
    .promo-banner-section { padding: 48px 0; background: #ffffff; }
    .promo-banner-card {
      background: var(--pastel-blue);
      border-radius: 20px;
      padding: 32px 40px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 28px;
      flex-wrap: wrap;
    }
    .promo-left { display: flex; align-items: center; gap: 24px; z-index: 2; }
    .promo-img-wrap { width: 72px; height: 72px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .promo-big-icon { font-size: 2.2rem; color: var(--accent); }
    .promo-center-text { text-align: left; }
    .promo-title { font-size: 2rem; font-weight: 900; color: var(--primary); margin: 0 0 6px; letter-spacing: 0.5px; }
    .promo-pill { display: inline-block; background: var(--accent); color: #ffffff; font-weight: 800; font-size: 0.88rem; padding: 4px 16px; border-radius: 999px; margin-bottom: 6px; box-shadow: 0 4px 10px rgba(236, 72, 153, 0.3); }
    .promo-sub { font-size: 1rem; font-weight: 600; color: #374151; margin: 0; }

    .promo-glass-box {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid #ffffff;
      border-radius: 16px;
      padding: 20px 28px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .glass-sub { font-size: 0.7rem; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .glass-mid { font-size: 0.82rem; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
    .glass-bold { font-size: 1.6rem; font-weight: 900; color: var(--primary); margin-bottom: 12px; }
    .btn-promo-cta {
      background: var(--primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 8px 24px;
      border-radius: 999px;
      text-decoration: none;
      transition: background .15s;
    }
    .btn-promo-cta:hover { background: #172554; }

    /* ================= 6. JUST FOR YOU FEED ================= */
    .jfy-section { padding: 48px 0 64px; background: #ffffff; }
    .jfy-head-wrap { margin-bottom: 24px; border-bottom: 3px solid var(--primary); display: inline-block; padding-bottom: 6px; }
    .jfy-title { font-size: 1.6rem; font-weight: 800; color: var(--primary); margin: 0; }
    .dense-product-grid {
      display: grid;
      grid-template-columns: repeat(var(--listing-cols), minmax(0, 1fr));
      gap: 16px;
    }
    .load-more-wrap { display: flex; justify-content: center; margin-top: 36px; }
    .load-more-btn { padding: 12px 32px; border-radius: 999px; font-weight: 700; font-size: 0.95rem; border: 2px solid var(--line); color: var(--primary); cursor: pointer; }
    .load-more-btn:hover { border-color: var(--primary); background: var(--brand-soft); }
    .feed-end-msg { text-align: center; color: #9ca3af; margin-top: 32px; font-size: 0.88rem; }

    @media (max-width: 960px) {
      .hero-container { flex-direction: column; text-align: center; }
      .hero-left { max-width: none; }
      .hero-desc { margin: 0 auto 24px; }
      .hero-trust-row { justify-content: center; }
      .promo-banner-card { justify-content: center; text-align: center; }
      .promo-left { flex-direction: column; text-align: center; }
      .promo-center-text { text-align: center; }
    }

    @media (max-width: 640px) {
      .category-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .cat-circle-avatar { width: 70px; height: 70px; font-size: 1.7rem; }
      .cat-circle-title { font-size: 0.78rem; }
    }
  `],
})
export class HomeComponent implements OnInit, OnDestroy {
  featured = signal<Product[]>([]);
  deals = signal<Product[]>([]);
  feed = signal<Product[]>([]);
  loading = signal(true);
  loadingMore = signal(false);
  countdown = signal('00:00:00');
  flash = signal<FlashSale | null>(null);
  private expired = signal(false);

  cols = signal(DEFAULT_COLS);
  rows = signal(ROWS_SHOWN);

  visibleFeed = computed(() => this.feed().slice(0, this.cols() * this.rows()));

  private page = 1;
  private totalPages = 1;
  private timer?: ReturnType<typeof setInterval>;

  visualCategories: VisualCategory[] = [
    { name: 'School Essentials', sub: 'Smart supplies', slug: 'school-essentials', icon: 'fas fa-backpack', bgClass: 'bg-pastel-yellow', iconColor: '#ca8a04', emoji: '🎒' },
    { name: 'Toys & Fun', sub: 'Play, learn & grow', slug: 'toys-fun', icon: 'fas fa-puzzle-piece', bgClass: 'bg-pastel-green', iconColor: '#16a34a' },
    { name: 'Lunch & Mealtime', sub: 'Happy meal times', slug: 'lunch-mealtime', icon: 'fas fa-utensils', bgClass: 'bg-pastel-blue', iconColor: '#0284c7' },
    { name: 'Learning & Stationery', sub: 'Creativity & craft', slug: 'learning-stationery', icon: 'fas fa-pencil-alt', bgClass: 'bg-pastel-purple', iconColor: '#9333ea' },
    { name: 'Kids Care & Essentials', sub: 'Comfort & daily care', slug: 'kids-care-essentials', icon: 'fas fa-tshirt', bgClass: 'bg-pastel-pink', iconColor: '#db2777' },
    { name: 'Gifts for Kids', sub: 'Perfect surprises', slug: 'gifts-for-kids', icon: 'fas fa-gift', bgClass: 'bg-pastel-red', iconColor: '#dc2626' },
    { name: 'Newborn & Baby', sub: 'Gentle care', slug: 'newborn-baby', icon: 'fas fa-baby-carriage', bgClass: 'bg-pastel-pink', iconColor: '#ec4899' },
    { name: 'Teen Girls', sub: 'Trendy lifestyle', slug: 'teen-girls', icon: 'fas fa-gem', bgClass: 'bg-pastel-purple', iconColor: '#7c3aed' },
  ];

  constructor(
    private products: ProductService,
    private flashSvc: FlashSaleService,
    private cats: CategoryService
  ) {}

  ngOnInit() {
    this.readCols();

    this.flashSvc.get().subscribe({
      next: (s) => {
        this.flash.set(s);
        this.tick();
        if (s.isEnabled) this.loadDeals(s);
      },
      error: () => this.flash.set(null),
    });

    this.products.list({ featured: true, limit: 12 }).subscribe({
      next: (r) => this.featured.set(r.items),
      error: () => this.featured.set([]),
    });

    this.products.list({ sort: 'popular', page: 1, limit: PAGE_SIZE }).subscribe({
      next: (r) => {
        this.feed.set(r.items);
        this.totalPages = r.pages;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  hasMore() {
    return this.visibleFeed().length < this.feed().length || this.page < this.totalPages;
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;

    const nextRows = this.rows() + ROWS_SHOWN;
    const needed = this.cols() * nextRows;
    this.rows.set(nextRows);

    if (needed <= this.feed().length || this.page >= this.totalPages) return;

    this.loadingMore.set(true);
    const next = this.page + 1;
    this.products.list({ sort: 'popular', page: next, limit: PAGE_SIZE }).subscribe({
      next: (r) => {
        this.feed.update((cur) => [...cur, ...r.items]);
        this.page = next;
        this.totalPages = r.pages;
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  @HostListener('window:resize')
  readCols() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--listing-cols');
    const n = parseInt(raw.trim(), 10);
    this.cols.set(Number.isFinite(n) && n > 0 ? n : DEFAULT_COLS);
  }

  private loadDeals(s: FlashSale) {
    this.products.list({ flashSale: true, sort: s.sort, limit: s.limit }).subscribe({
      next: (r) => {
        if (r.items && r.items.length > 0) {
          this.deals.set(r.items);
        } else {
          this.products.list({ onSale: true, sort: s.sort, limit: s.limit }).subscribe({
            next: (res) => this.deals.set(res.items),
            error: () => this.deals.set([]),
          });
        }
      },
      error: () => this.deals.set([]),
    });
  }

  showFlash(): boolean {
    const s = this.flash();
    return !!s && s.isEnabled && !this.expired();
  }

  ctaRoute(): string {
    return (this.flash()?.ctaLink || '/shop').split('?')[0] || '/shop';
  }

  ctaParams(): Record<string, string> {
    const qs = (this.flash()?.ctaLink || '').split('?')[1];
    const out: Record<string, string> = {};
    if (qs) new URLSearchParams(qs).forEach((v, k) => (out[k] = v));
    return out;
  }

  private tick() {
    const s = this.flash();
    if (!s || s.countdownMode === 'none') return;

    const now = new Date();
    let target: Date;

    if (s.countdownMode === 'endsAt') {
      if (!s.endsAt) return;
      target = new Date(s.endsAt);
      if (target.getTime() <= now.getTime()) {
        this.expired.set(true);
        this.countdown.set('00:00:00');
        return;
      }
      this.expired.set(false);
    } else {
      target = new Date(now);
      target.setHours(24, 0, 0, 0);
    }

    const left = Math.max(0, target.getTime() - now.getTime());
    const pad = (n: number) => String(n).padStart(2, '0');
    const days = Math.floor(left / 86_400_000);
    const h = Math.floor((left % 86_400_000) / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const sec = Math.floor((left % 60_000) / 1000);
    this.countdown.set(
      days > 0
        ? `${days}d ${pad(h)}:${pad(m)}:${pad(sec)}`
        : `${pad(h)}:${pad(m)}:${pad(sec)}`
    );
  }
}
