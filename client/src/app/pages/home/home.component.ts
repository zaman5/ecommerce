import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FlashSaleService, ProductService, CategoryService, BannerService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
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
    <!-- ================= 1. FLASH SALE / DEALS (TOP FIRST) ================= -->
    @if (showFlash() && deals().length) {
      <section class="popular-section flash-sale-top">
        <div class="container">
          <div class="section-heading-between">
            <div class="heading-left">
              <h2 class="font-nunito section-title">{{ flash()!.title || 'Flash Sale' }} 🔥</h2>
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

    <!-- ================= 2. HERO BANNER (SINGLE BANNER AFTER FLASH SALES) ================= -->
    <section class="hero-banner-section">
      <div class="container">
        <app-hero-banner />
      </div>
    </section>

    <!-- ================= 3. SHOP BY CATEGORY ================= -->
    <section class="category-section">
      <div class="container">
        <div class="section-heading-center">
          <h2 class="font-nunito section-title">
            Shop by Category <span class="heading-emoji">🍬</span>
          </h2>
        </div>

        <div class="cat-rail-wrap">
          <button
            class="rail-nav prev"
            [class.show]="canCatPrev()"
            [attr.tabindex]="canCatPrev() ? 0 : -1"
            (click)="catPage(-1)"
            aria-label="Scroll backward"
          >‹</button>

          <div class="category-rail" #catTrack (scroll)="syncCatRail()">
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

          <button
            class="rail-nav next"
            [class.show]="canCatNext()"
            [attr.tabindex]="canCatNext() ? 0 : -1"
            (click)="catPage(1)"
            aria-label="Scroll forward"
          >›</button>
        </div>
      </div>
    </section>

    <!-- ================= 4. POPULAR PICKS ================= -->
    <section class="popular-section bg-alt">
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

    <!-- ================= 5. FEATURES STRIP ================= -->
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

    <!-- ================= 6. OPENING SALE BANNER ================= -->
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
  `,
  styles: [`
    /* ================= HERO BANNER SECTION ================= */
    .hero-banner-section {
      background: #fef9f1;
      padding: 24px 0 32px;
      position: relative;
    }

    /* ================= 2. SHOP BY CATEGORY ================= */
    .category-section { padding: 48px 0; background: #ffffff; }
    .section-heading-center { text-align: center; margin-bottom: 24px; }
    .section-title { font-size: 1.75rem; font-weight: 800; color: var(--primary); margin: 0; display: inline-flex; align-items: center; gap: 8px; }
    .heading-emoji { font-size: 1.4rem; }

    .cat-rail-wrap { position: relative; }
    .category-rail {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      scroll-behavior: smooth;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 8px 4px;
    }
    .category-rail::-webkit-scrollbar { display: none; }

    .cat-circle-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      padding: 10px 8px;
      flex: 0 0 130px;
      text-align: center;
      transition: transform .2s ease;
    }
    .cat-circle-card:hover { transform: translateY(-4px); }

    .cat-circle-avatar {
      width: 82px;
      height: 82px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      margin-bottom: 10px;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .cat-circle-emoji {
      font-size: 2.2rem;
      line-height: 1;
      display: inline-block;
      transition: transform .2s ease;
    }
    .cat-circle-card:hover .cat-circle-avatar {
      transform: scale(1.06);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
    }
    .cat-circle-card:hover .cat-circle-emoji {
      transform: scale(1.1);
    }
    .cat-circle-title {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 0.85rem;
      color: #1f2937;
      margin: 0 0 2px;
      line-height: 1.2;
      white-space: normal;
    }
    .cat-circle-sub { font-size: 0.7rem; color: #9ca3af; margin: 0; white-space: normal; }

    .rail-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 42px; height: 42px; border-radius: 50%;
      border: 1px solid var(--line); background: rgba(255, 255, 255, .96);
      box-shadow: var(--shadow); color: var(--ink);
      font-family: var(--font-display); font-size: 1.7rem; line-height: 1;
      display: grid; place-items: center; cursor: pointer; z-index: 3;
      padding-bottom: 4px;
      opacity: 0; visibility: hidden;
      transition: opacity .18s ease, visibility .18s ease, background .15s ease, transform .12s ease;
    }
    .rail-nav.show { opacity: 1; visibility: visible; }
    .rail-nav:hover { background: #fff; color: var(--brand-dark); }
    .rail-nav:active { transform: translateY(-50%) scale(.94); }
    .rail-nav:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
    .rail-nav.prev { left: -8px; }
    .rail-nav.next { right: -8px; }

    @media (hover: none) and (pointer: coarse) {
      .rail-nav { display: none; }
    }

    @media (max-width: 640px) {
      .category-rail { gap: 10px; }
      .cat-circle-card { flex: 0 0 100px; padding: 6px 4px; }
      .cat-circle-avatar { width: 66px; height: 66px; font-size: 1.6rem; }
      .cat-circle-emoji { font-size: 1.8rem; }
      .cat-circle-title { font-size: 0.75rem; }
    }

    /* ================= FLASH SALE / POPULAR ================= */
    .popular-section { padding: 44px 0; background: #ffffff; }
    .popular-section.bg-alt { background: #f9fafb; }
    .flash-sale-top { padding: 36px 0 32px; background: #ffffff; border-bottom: 1px solid #f3f4f6; }
    .section-heading-between { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 10px; }
    .heading-left { display: flex; flex-direction: column; gap: 2px; }
    .section-subtitle { font-size: 0.85rem; color: #6b7280; margin: 0; }
    .flash-timer-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #6b7280; font-weight: 600; margin-top: 4px; }
    .flash-timer-badge b { background: var(--primary); color: #ffffff; padding: 3px 8px; border-radius: 6px; font-family: var(--font-display); font-size: 0.85rem; }
    .see-all-link { color: var(--primary); font-weight: 700; font-size: 0.88rem; text-decoration: none; }
    .see-all-link:hover { text-decoration: underline; }

    /* ================= 4. FEATURES STRIP ================= */
    .features-strip { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 28px 0; background: #ffffff; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .feature-item { display: flex; align-items: center; gap: 14px; }
    .feature-icon-circle { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: var(--primary); flex: none; }
    .feature-title { font-weight: 700; font-size: 0.86rem; color: #1f2937; margin: 0 0 2px; }
    .feature-desc { font-size: 0.73rem; color: #6b7280; margin: 0; }

    /* ================= 5. OPENING SALE PROMO ================= */
    .promo-banner-section { padding: 44px 0; background: #ffffff; }
    .promo-banner-card {
      background: var(--pastel-blue);
      border-radius: 20px;
      padding: 28px 36px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .promo-left { display: flex; align-items: center; gap: 20px; z-index: 2; }
    .promo-img-wrap { width: 66px; height: 66px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .promo-big-icon { font-size: 2rem; color: var(--accent); }
    .promo-center-text { text-align: left; }
    .promo-title { font-size: 1.8rem; font-weight: 900; color: var(--primary); margin: 0 0 4px; letter-spacing: 0.5px; }
    .promo-pill { display: inline-block; background: var(--accent); color: #ffffff; font-weight: 800; font-size: 0.82rem; padding: 3px 14px; border-radius: 999px; margin-bottom: 4px; box-shadow: 0 4px 10px rgba(236, 72, 153, 0.3); }
    .promo-sub { font-size: 0.95rem; font-weight: 600; color: #374151; margin: 0; }

    .promo-glass-box {
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(8px);
      border: 1px solid #ffffff;
      border-radius: 16px;
      padding: 18px 24px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .glass-sub { font-size: 0.68rem; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .glass-mid { font-size: 0.8rem; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
    .glass-bold { font-size: 1.5rem; font-weight: 900; color: var(--primary); margin-bottom: 10px; }
    .btn-promo-cta {
      background: var(--primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.82rem;
      padding: 7px 22px;
      border-radius: 999px;
      text-decoration: none;
      transition: background .15s;
    }
    .btn-promo-cta:hover { background: #172554; }

    /* ================= 6. EXPLORE FEED GRID ================= */
    .explore-section { padding: 44px 0 60px; background: #ffffff; }
    .feed-grid {
      display: grid;
      grid-template-columns: repeat(var(--listing-cols, 4), minmax(0, 1fr));
      gap: 16px;
    }
    .btn-load-more {
      padding: 12px 32px;
      font-size: 0.95rem;
      border-radius: 999px;
      border: 2px solid var(--line);
    }
    .btn-load-more:hover { border-color: var(--primary); color: var(--primary); }

    @media (max-width: 960px) {
      .promo-banner-card { justify-content: center; text-align: center; }
      .promo-left { flex-direction: column; text-align: center; }
      .promo-center-text { text-align: center; }
    }

    @media (max-width: 768px) {
      .hero-banner-section { padding: 14px 0 20px; }
      .section-title { font-size: 1.4rem; }
      .feed-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .popular-section { padding: 32px 0; }
      .flash-sale-top { padding: 24px 0 20px; }
      .features-strip { padding: 20px 0; }
      .features-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
      .promo-banner-section { padding: 32px 0; }
    }

    @media (max-width: 560px) {
      .category-rail { gap: 8px; padding: 4px 2px; }
      .cat-circle-card { flex: 0 0 85px; padding: 6px 2px; }
      .cat-circle-avatar { width: 58px; height: 58px; font-size: 1.4rem; margin-bottom: 6px; }
      .cat-circle-title { font-size: 0.7rem; }
      .cat-circle-sub { font-size: 0.65rem; }
      .promo-banner-card { padding: 20px 14px; gap: 16px; border-radius: 14px; }
      .promo-title { font-size: 1.4rem; }
      .promo-sub { font-size: 0.85rem; }
      .promo-glass-box { padding: 14px 18px; width: 100%; }
      .btn-promo-cta { width: 100%; text-align: center; }
      .features-grid { grid-template-columns: 1fr; gap: 12px; }
      .feed-grid { gap: 8px; }
      .btn-load-more { padding: 10px 24px; font-size: 0.88rem; }
    }

    @media (max-width: 380px) {
      .cat-circle-card { flex: 0 0 76px; }
      .cat-circle-avatar { width: 52px; height: 52px; font-size: 1.25rem; }
      .cat-circle-title { font-size: 0.66rem; }
    }
  `],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  featured = signal<Product[]>([]);
  deals = signal<Product[]>([]);
  feed = signal<Product[]>([]);
  loading = signal(true);
  loadingMore = signal(false);
  countdown = signal('00:00:00');
  flash = signal<FlashSale | null>(null);
  private expired = signal(false);

  @ViewChild('catTrack') private catTrack?: ElementRef<HTMLDivElement>;
  canCatPrev = signal(false);
  canCatNext = signal(false);
  private catRo?: ResizeObserver;

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
    private cats: CategoryService,
    private seoSvc: SeoService
  ) {}

  ngOnInit() {
    this.seoSvc.setHomeSeo();
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

  ngAfterViewInit() {
    this.syncCatRail();
    if (this.catTrack?.nativeElement) {
      this.catRo = new ResizeObserver(() => this.syncCatRail());
      this.catRo.observe(this.catTrack.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.catRo?.disconnect();
    this.seoSvc.clearStructuredData('home-json-ld');
  }

  catPage(direction: 1 | -1) {
    const el = this.catTrack?.nativeElement;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.cat-circle-card');
    const step = card ? card.getBoundingClientRect().width * 2 + 32 : 280;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  syncCatRail() {
    const el = this.catTrack?.nativeElement;
    if (!el) return;
    this.canCatPrev.set(el.scrollLeft > 2);
    this.canCatNext.set(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
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
