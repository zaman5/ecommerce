import { Component, HostListener, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FlashSaleService, ProductService } from '../../core/services/api.service';
import { FlashSale, Product } from '../../core/models/models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { ProductRailComponent } from '../../shared/components/product-rail.component';
import { HeroBannerComponent } from '../../shared/components/hero-banner.component';

/** How many products the "Just For You" feed pulls per request. */
const PAGE_SIZE = 20;

/**
 * How many rows of the feed the home page shows, and how many more each "Load
 * More" adds. Rows rather than a product count: the grid is 2–5 columns wide
 * depending on the screen, so a fixed count would be two rows on a desktop and
 * five on a phone.
 */
const ROWS_SHOWN = 2;

/** Fallback if --listing-cols can't be read (SSR, or a stylesheet still loading). */
const DEFAULT_COLS = 4;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ProductRailComponent, HeroBannerComponent],
  template: `
    <!-- PROMO BANNERS — managed in Admin → Banners -->
    <app-hero-banner />

    <!-- FLASH SALE — every part of this head is set in Admin → Flash Sale -->
    @if (showFlash() && deals().length) {
      <section class="flash">
        <div class="container">
          <div class="flash-head">
            <h2>{{ flash()!.title }}</h2>
            @if (flash()!.countdownMode !== 'none') {
              <div class="timer" [attr.aria-label]="flash()!.timerLabel">
                <span>{{ flash()!.timerLabel }}</span>
                <b>{{ countdown() }}</b>
              </div>
            }
            @if (flash()!.ctaLabel) {
              <a [routerLink]="ctaRoute()" [queryParams]="ctaParams()" class="see">{{ flash()!.ctaLabel }} ›</a>
            }
          </div>
          <app-product-rail [products]="deals()" />
        </div>
      </section>
    }

    <!-- FEATURED RAIL -->
    @if (featured().length) {
      <section class="flash featured-rail">
        <div class="container">
          <div class="flash-head">
            <h2>Back-to-school favourites</h2>
            <a routerLink="/shop" class="see">See all ›</a>
          </div>
          <app-product-rail [products]="featured()" />
        </div>
      </section>
    }

    <!-- JUST FOR YOU -->
    <section class="jfy">
      <div class="container">
        <div class="jfy-head"><h2>Just For You</h2></div>
        @if (loading()) { <div class="spinner"></div> }
        @else {
          <div class="dense-grid">
            @for (p of visibleFeed(); track p._id) { <app-product-card [product]="p" [dense]="true" /> }
          </div>
          @if (loadingMore()) { <div class="spinner"></div> }
          @if (hasMore()) {
            <div class="more-wrap">
              <button class="btn btn-ghost" [disabled]="loadingMore()" (click)="loadMore()">
                {{ loadingMore() ? 'Loading…' : 'Load More' }}
              </button>
            </div>
          } @else if (visibleFeed().length) {
            <p class="end">You've reached the end — {{ visibleFeed().length }} products shown.</p>
          }
        }
      </div>
    </section>

    <!-- PROMISE -->
    <section class="section">
      <div class="container promise">
        <h2>Why parents choose Wondercart</h2>
        <div class="grid grid-3 mt-lg">
          <div class="promise-card"><span>🛡️</span><h3>Built to last</h3><p>Reinforced bags, leak-proof boxes and non-toxic supplies that survive the term.</p></div>
          <div class="promise-card"><span>📦</span><h3>Fast delivery</h3><p>Dispatched within 24 hours with live order tracking.</p></div>
          <div class="promise-card"><span>💬</span><h3>Real support</h3><p>Friendly help whenever you need it, from real people.</p></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .see { color: var(--ink); font-weight:700; font-size:.9rem; white-space:nowrap; }
    .see:hover { color: var(--brand); }

    /* ---- flash sale ---- */
    .flash { background: var(--cream); padding: 26px 0; }
    .flash-head { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:16px; }
    .flash-head h2 { font-size:1.4rem; margin:0; }
    .timer { display:flex; align-items:center; gap:8px; font-size:.82rem; color: var(--muted); }
    .timer b { font-family: var(--font-display); background: var(--ink); color:#fff; padding:3px 10px;
      border-radius:6px; font-size:.9rem; letter-spacing:.5px; font-variant-numeric: tabular-nums; }
    .flash-head .see { margin-left:auto; }

    /* ---- just for you ---- */
    .featured-rail { background:#fff; }
    .promise { text-align:center; }
    .promise-card { background: var(--cream); border-radius: var(--radius); padding: 28px; }
    .promise-card span { font-size:2.4rem; }
    .promise-card h3 { margin:12px 0 6px; }
    .promise-card p { color: var(--muted); margin:0; }
    .jfy { background: var(--cream); padding: 26px 0 56px; }
    .jfy-head { margin-bottom:16px; border-bottom:3px solid var(--ink); display:inline-block; padding-bottom:6px; }
    .jfy-head h2 { font-size:1.4rem; margin:0; }
    /* Column count comes from --listing-cols in styles.css, so the rails above
       and the catalogue on /shop step together — a row never mixes card sizes.
       minmax(0,1fr) rather than 1fr: a long product title would otherwise set a
       column's minimum width and knock the row out of even thirds. */
    .dense-grid { display:grid; grid-template-columns: repeat(var(--listing-cols), minmax(0, 1fr)); gap:12px; }
    .more-wrap { display:flex; justify-content:center; margin-top:28px; }
    .end { text-align:center; color: var(--muted); margin-top:28px; font-size:.9rem; }
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
  /** Flips to true when an `endsAt` sale runs out, without a page reload. */
  private expired = signal(false);

  /**
   * Columns the grid is currently showing, read from the --listing-cols CSS
   * variable rather than re-declaring the breakpoints here. One source of truth:
   * change the ladder in styles.css and the row maths follows.
   */
  cols = signal(DEFAULT_COLS);
  rows = signal(ROWS_SHOWN);

  /**
   * Exactly `rows` rows' worth. Slicing what is already loaded rather than
   * re-fetching means widening the window from 4 to 5 columns fills the extra
   * slots instantly, with no request and no half-empty row.
   */
  visibleFeed = computed(() => this.feed().slice(0, this.cols() * this.rows()));

  private page = 1;
  private totalPages = 1;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private products: ProductService, private flashSvc: FlashSaleService) {}

  ngOnInit() {
    this.readCols();

    // The strip's settings decide how many deals to pull and in what order, so
    // they have to arrive before the products do.
    this.flashSvc.get().subscribe({
      next: (s) => {
        this.flash.set(s);
        this.tick();
        if (s.isEnabled) this.loadDeals(s);
      },
      // Settings are presentation, not content — if the request fails the strip
      // simply stays hidden rather than blocking the rest of the page.
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
    // Without this the interval keeps firing after navigation.
    if (this.timer) clearInterval(this.timer);
  }

  /** More to show if the window is hiding some, or the server has further pages. */
  hasMore() {
    return this.visibleFeed().length < this.feed().length || this.page < this.totalPages;
  }

  /**
   * Opens the window by another {@link ROWS_SHOWN} rows, fetching only when
   * those rows aren't already loaded — the first click is usually instant
   * because one request covers several rows.
   */
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

  /**
   * Keeps the row count honest across a breakpoint change — a resize alters how
   * many columns the CSS is drawing, and the slice has to follow it.
   */
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
          // Fallback to all discounted items if no specific products have flashSale flag
          this.products.list({ onSale: true, sort: s.sort, limit: s.limit }).subscribe({
            next: (res) => this.deals.set(res.items),
            error: () => this.deals.set([]),
          });
        }
      },
      error: () => this.deals.set([]),
    });
  }

  /** Shown only when switched on, in date, and there is something to show. */
  showFlash(): boolean {
    const s = this.flash();
    return !!s && s.isEnabled && !this.expired();
  }

  /** The CTA link is free text, so split it the way routerLink needs. */
  ctaRoute(): string {
    return (this.flash()?.ctaLink || '/shop').split('?')[0] || '/shop';
  }

  ctaParams(): Record<string, string> {
    const qs = (this.flash()?.ctaLink || '').split('?')[1];
    const out: Record<string, string> = {};
    if (qs) new URLSearchParams(qs).forEach((v, k) => (out[k] = v));
    return out;
  }

  /**
   * Recomputes the countdown once a second.
   *
   * 'midnight' is the daily-deals boundary the strip shipped with; 'endsAt'
   * targets a fixed moment and retires the whole section when it passes, since
   * a sale frozen at 00:00:00 is worse than no sale at all. Over 24 hours the
   * clock grows a day part rather than showing a meaningless "47:12:06".
   */
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
