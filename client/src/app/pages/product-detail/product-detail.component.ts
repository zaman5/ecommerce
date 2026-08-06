import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService, ReviewService } from '../../core/services/api.service';
import { Product, Review, ReviewSummary } from '../../core/models/models';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ImgFallbackDirective],
  template: `
    <section class="section">
      <div class="container">
        @if (loading()) { <div class="spinner"></div> }
        @else if (product()) {
          @if (product(); as p) {
          <a routerLink="/shop" class="back">← Back to shop</a>
          <div class="detail">
            <div class="gallery">
              <img [src]="active() || fallback" [alt]="p.name" class="main-img" appImgFallback />
              @if (p.images.length > 1) {
                <div class="thumbs">
                  @for (img of p.images; track img) {
                    <img [src]="img" [class.on]="img === active()" (click)="active.set(img)" alt="thumbnail" appImgFallback />
                  }
                </div>
              }
            </div>

            <div class="info">
              <div class="brand">{{ p.brand }}</div>
              <h1>{{ p.name }}</h1>
              <div class="rating">
                <span class="stars" [attr.aria-label]="'Rated ' + (p.rating | number:'1.1-1') + ' out of 5'">{{ stars(p.rating) }}</span>
                {{ p.rating | number:'1.1-1' }}
                <a class="review-jump" href="javascript:void(0)" (click)="scrollToReviews()">
                  ({{ p.numReviews }} {{ p.numReviews === 1 ? 'review' : 'reviews' }})
                </a>
              </div>

              <div class="price-row">
                <span class="price big">Rs {{ p.price | number }}</span>
                @if (p.compareAtPrice > p.price) {
                  <span class="strike">Rs {{ p.compareAtPrice | number }}</span>
                  <span class="badge badge-sale">Save {{ discount(p) }}%</span>
                }
              </div>

              @if (p.stock > 0) {
                <div class="stock in">✓ In stock ({{ p.stock }} available)</div>
              } @else {
                <div class="stock out">Out of stock</div>
              }

              <p class="desc">{{ p.description }}</p>

              <div class="meta">
                <div><span>School level</span><strong>{{ ageLabel(p.ageGroup) }}</strong></div>
                <div><span>Category</span><strong>{{ catName(p) }}</strong></div>
              </div>

              @if (p.stock > 0) {
                <div class="buy">
                  <div class="qty">
                    <button (click)="qty.set(Math.max(1, qty()-1))">−</button>
                    <span>{{ qty() }}</span>
                    <button (click)="qty.set(Math.min(p.stock, qty()+1))">+</button>
                  </div>
                  <button class="btn btn-primary" (click)="addToCart(p)">Add to cart</button>
                </div>
                @if (added()) { <div class="alert alert-success mt">Added to your cart! 🎉</div> }
              }
            </div>
          </div>

          <!-- ============================ REVIEWS ============================ -->
          <div class="reviews card card-pad" id="reviews">
            <h2>Customer reviews</h2>

            @if (reviewsLoading()) { <div class="spinner"></div> }
            @else {
              @if (summary(); as s) {
              <div class="rev-top">
                <div class="rev-score">
                  <div class="big-score">{{ s.average | number:'1.1-1' }}</div>
                  <div class="stars big">{{ stars(s.average) }}</div>
                  <div class="text-muted">{{ s.total }} {{ s.total === 1 ? 'review' : 'reviews' }}</div>
                </div>
                <div class="rev-bars">
                  @for (b of s.breakdown; track b.star) {
                    <div class="bar-row">
                      <span class="bar-label">{{ b.star }} ★</span>
                      <div class="bar"><div class="fill" [style.width.%]="s.total ? (b.count / s.total) * 100 : 0"></div></div>
                      <span class="bar-count">{{ b.count }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Write / edit your review -->
              <div class="write">
                @if (!auth.isLoggedIn()) {
                  <div class="alert alert-info">
                    <a routerLink="/login" [queryParams]="{ redirect: '/product/' + p.slug }" class="link">Log in</a>
                    to share your experience with this product.
                  </div>
                } @else {
                  <h3>{{ myReview() ? 'Edit your review' : 'Write a review' }}</h3>
                  @if (reviewError()) { <div class="alert alert-error">{{ reviewError() }}</div> }
                  @if (reviewSaved()) { <div class="alert alert-success">Thanks! Your review has been saved. 💛</div> }

                  <div class="star-picker" role="radiogroup" aria-label="Your rating">
                    @for (n of [1,2,3,4,5]; track n) {
                      <button type="button" class="star-btn" [class.on]="n <= (hover() || form.rating)"
                              (mouseenter)="hover.set(n)" (mouseleave)="hover.set(0)"
                              (click)="form.rating = n" [attr.aria-label]="n + ' star' + (n > 1 ? 's' : '')">★</button>
                    }
                    <span class="text-muted picker-label">{{ ratingLabel(form.rating) }}</span>
                  </div>

                  <textarea class="input" rows="3" [(ngModel)]="form.comment" name="comment"
                            placeholder="What did you think? (optional)" maxlength="1000"></textarea>

                  <div class="write-actions">
                    <button class="btn btn-primary" [disabled]="savingReview()" (click)="submitReview(p)">
                      {{ savingReview() ? 'Saving…' : (myReview() ? 'Update review' : 'Submit review') }}
                    </button>
                    @if (myReview()) {
                      <button class="btn btn-ghost" [disabled]="savingReview()" (click)="deleteMyReview(p)">Delete</button>
                    }
                  </div>
                }
              </div>

              <!-- The list -->
              @if (s.reviews.length === 0) {
                <p class="text-muted mt">No reviews yet — be the first to review this product.</p>
              } @else {
                <div class="rev-list">
                  @for (r of s.reviews; track r._id) {
                    <div class="rev">
                      <div class="rev-head">
                        <div class="avatar">{{ initials(r.name) }}</div>
                        <div>
                          <strong>{{ r.name }}</strong>
                          @if (r.verifiedPurchase) { <span class="badge verified">✓ Verified purchase</span> }
                          <div class="stars small">{{ stars(r.rating) }}
                            <span class="text-muted">· {{ r.createdAt | date:'mediumDate' }}</span>
                          </div>
                        </div>
                        @if (canDelete(r)) {
                          <button class="rev-del" (click)="deleteReview(r, p)" aria-label="Delete review">✕</button>
                        }
                      </div>
                      @if (r.comment) { <p class="rev-body">{{ r.comment }}</p> }
                    </div>
                  }
                </div>
              }
              }
            }
          </div>
          }
        } @else {
          <div class="center"><h2>Product not found</h2><a routerLink="/shop" class="btn btn-primary mt">Back to shop</a></div>
        }
      </div>
    </section>
  `,
  styles: [`
    .back { color: var(--muted); font-weight:700; display:inline-block; margin-bottom:18px; }
    .detail { display:grid; grid-template-columns: 1fr 1fr; gap:40px; }
    .main-img { width:100%; aspect-ratio:1/1; object-fit:cover; border-radius: var(--radius-lg); box-shadow: var(--shadow); background: var(--cream-deep); }
    .thumbs { display:flex; gap:10px; margin-top:12px; }
    .thumbs img { width:70px; height:70px; object-fit:cover; border-radius:12px; cursor:pointer; border:2px solid transparent; }
    .thumbs img.on { border-color: var(--coral); }
    .brand { color: var(--mint); font-weight:800; text-transform:uppercase; letter-spacing:.05em; font-size:.85rem; }
    .info h1 { font-size:2rem; margin:6px 0; }
    .rating { color:#f0a500; font-weight:700; display:flex; align-items:center; gap:8px; }
    .stars { letter-spacing:2px; }
    .review-jump { color: var(--muted); font-weight:600; font-size:.9rem; text-decoration:underline; cursor:pointer; }
    .review-jump:hover { color: var(--coral); }
    .price-row { display:flex; align-items:center; gap:12px; margin:16px 0; }
    .price.big { font-size:2rem; }
    .stock { font-weight:700; margin-bottom:14px; }
    .stock.in { color: var(--success); }
    .stock.out { color: var(--danger); }
    .desc { color: var(--muted); line-height:1.7; }
    .meta { display:flex; gap:32px; margin:20px 0; padding:16px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
    .meta span { display:block; font-size:.8rem; color: var(--muted); }
    .buy { display:flex; align-items:center; gap:16px; margin-top:20px; }
    .qty { display:flex; align-items:center; border:2px solid var(--line); border-radius:999px; overflow:hidden; }
    .qty button { width:42px; height:44px; border:none; background:#fff; font-size:1.3rem; cursor:pointer; }
    .qty span { width:44px; text-align:center; font-weight:800; font-family: var(--font-display); }

    /* ---- reviews ---- */
    .reviews { margin-top:40px; }
    .reviews h2 { font-size:1.6rem; margin:0 0 18px; }
    .rev-top { display:grid; grid-template-columns: 180px 1fr; gap:28px; align-items:center;
      padding-bottom:22px; border-bottom:1px solid var(--line); }
    .rev-score { text-align:center; }
    .big-score { font-family: var(--font-display); font-size:3rem; font-weight:800; line-height:1; }
    .stars.big { color:#f0a500; font-size:1.2rem; letter-spacing:3px; margin:6px 0 2px; }
    .stars.small { color:#f0a500; font-size:.9rem; letter-spacing:1px; }
    .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; font-size:.88rem; }
    .bar-label { width:38px; color: var(--muted); white-space:nowrap; }
    .bar { flex:1; height:9px; background: var(--cream-deep); border-radius:99px; overflow:hidden; }
    .fill { height:100%; background:#f0a500; border-radius:99px; transition: width .3s ease; }
    .bar-count { width:26px; text-align:right; color: var(--muted); }

    .write { padding:22px 0; border-bottom:1px solid var(--line); }
    .write h3 { margin:0 0 12px; }
    .write textarea { resize:vertical; }
    .star-picker { display:flex; align-items:center; gap:2px; margin-bottom:12px; }
    .star-btn { background:none; border:none; font-size:1.8rem; line-height:1; cursor:pointer; color: var(--line); padding:0 2px; transition: color .12s, transform .12s; }
    .star-btn.on { color:#f0a500; }
    .star-btn:hover { transform: scale(1.15); }
    .picker-label { margin-left:10px; font-size:.9rem; }
    .write-actions { display:flex; gap:10px; margin-top:12px; }
    .link { color: var(--coral); font-weight:700; }

    .rev-list { display:flex; flex-direction:column; }
    .rev { padding:18px 0; border-bottom:1px solid var(--line); }
    .rev:last-child { border-bottom:none; }
    .rev-head { display:flex; align-items:flex-start; gap:12px; }
    .avatar { width:40px; height:40px; border-radius:50%; background: var(--mint-soft); color:#2f7d72;
      display:grid; place-items:center; font-weight:800; font-family: var(--font-display); flex-shrink:0; }
    .badge.verified { background:#dff5ec; color:#2f855a; margin-left:8px; font-size:.7rem; }
    .rev-body { margin:10px 0 0 52px; color: var(--muted); line-height:1.6; }
    .rev-del { margin-left:auto; background:none; border:none; color: var(--muted); cursor:pointer; font-size:1rem; padding:4px 6px; border-radius:8px; }
    .rev-del:hover { color: var(--danger); background: var(--cream); }

    @media (max-width: 800px) {
      .detail { grid-template-columns: 1fr; gap:24px; }
      .rev-top { grid-template-columns: 1fr; gap:16px; }
      .rev-body { margin-left:0; }
    }
  `],
})
export class ProductDetailComponent implements OnInit {
  product = signal<Product | null>(null);
  loading = signal(true);
  active = signal<string>('');
  qty = signal(1);
  added = signal(false);
  Math = Math;
  fallback = FALLBACK_IMAGE;

  // --- reviews ---
  summary = signal<ReviewSummary | null>(null);
  reviewsLoading = signal(true);
  savingReview = signal(false);
  reviewError = signal('');
  reviewSaved = signal(false);
  hover = signal(0);
  form = { rating: 0, comment: '' };

  constructor(
    private route: ActivatedRoute,
    private productSvc: ProductService,
    private reviewSvc: ReviewService,
    private cart: CartService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug')!;
      this.loading.set(true);
      this.productSvc.getBySlug(slug).subscribe({
        next: (p) => { this.product.set(p); this.active.set(p.images?.[0] || ''); this.loading.set(false); },
        error: () => { this.product.set(null); this.loading.set(false); },
      });
      this.loadReviews(slug);
    });
  }

  private loadReviews(slug: string) {
    this.reviewsLoading.set(true);
    this.reviewSvc.list(slug).subscribe({
      next: (s) => {
        this.summary.set(s);
        // Pre-fill the form with the reader's own review so they can edit it.
        const mine = this.myReview();
        this.form = mine ? { rating: mine.rating, comment: mine.comment } : { rating: 0, comment: '' };
        this.reviewsLoading.set(false);
        // The reviews block only exists once this data has rendered, so the
        // router's own #reviews scroll has already come and gone by now.
        // Arriving from "Write a review" on a delivered order lands here.
        if (this.route.snapshot.fragment === 'reviews') {
          setTimeout(() => this.scrollToReviews());
        }
      },
      error: () => { this.summary.set({ reviews: [], average: 0, total: 0, breakdown: [] }); this.reviewsLoading.set(false); },
    });
  }

  /** The logged-in reader's own review, if they've left one. */
  myReview(): Review | undefined {
    const uid = this.auth.user()?.id;
    if (!uid) return undefined;
    return this.summary()?.reviews.find((r) => r.user === uid);
  }

  canDelete(r: Review) {
    return this.auth.isAdmin() || r.user === this.auth.user()?.id;
  }

  submitReview(p: Product) {
    this.reviewError.set('');
    this.reviewSaved.set(false);
    if (!this.form.rating) { this.reviewError.set('Please choose a star rating first.'); return; }

    this.savingReview.set(true);
    this.reviewSvc.submit(p.slug, { rating: this.form.rating, comment: this.form.comment }).subscribe({
      next: () => {
        this.savingReview.set(false);
        this.reviewSaved.set(true);
        setTimeout(() => this.reviewSaved.set(false), 3000);
        this.refreshAfterReviewChange(p.slug);
      },
      error: (err) => {
        this.reviewError.set(err.error?.message || 'Could not save your review. Please try again.');
        this.savingReview.set(false);
      },
    });
  }

  deleteMyReview(p: Product) {
    const mine = this.myReview();
    if (mine) this.deleteReview(mine, p);
  }

  deleteReview(r: Review, p: Product) {
    this.savingReview.set(true);
    this.reviewSvc.remove(r._id).subscribe({
      next: () => { this.savingReview.set(false); this.refreshAfterReviewChange(p.slug); },
      error: (err) => {
        this.reviewError.set(err.error?.message || 'Could not delete that review.');
        this.savingReview.set(false);
      },
    });
  }

  /** Reviews changed → the product's average rating changed too, so refetch both. */
  private refreshAfterReviewChange(slug: string) {
    this.loadReviews(slug);
    this.productSvc.getBySlug(slug).subscribe((p) => this.product.set(p));
  }

  scrollToReviews() {
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** "★★★★☆" for a 0–5 score, rounded to the nearest whole star. */
  stars(score: number) {
    const filled = Math.round(score || 0);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  ratingLabel(n: number) {
    return ['Tap a star', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][n] || '';
  }

  initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  addToCart(p: Product) {
    this.cart.add(p, this.qty());
    this.added.set(true);
    setTimeout(() => this.added.set(false), 2500);
  }
  discount(p: Product) { return Math.round((1 - p.price / p.compareAtPrice) * 100); }
  catName(p: Product) { return typeof p.category === 'object' ? p.category.name : '—'; }
  ageLabel(a: string) {
    const map: Record<string, string> = { 'pre-school': 'Pre-school (3–5 yrs)', primary: 'Primary (5–10 yrs)', middle: 'Middle school (11–13 yrs)', high: 'High school (14+ yrs)', all: 'All levels' };
    return map[a] || a;
  }
}
