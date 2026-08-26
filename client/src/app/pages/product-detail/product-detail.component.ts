import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService, ReviewService } from '../../core/services/api.service';
import { Product, ProductColor, Review, ReviewSummary } from '../../core/models/models';
import { CartService } from '../../core/services/cart.service';
import { SavedService } from '../../core/services/saved.service';
import { AuthService } from '../../core/services/auth.service';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';
import { SwatchPipe } from '../../shared/pipes/swatch.pipe';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ImgFallbackDirective, SwatchPipe, MediaUrlPipe],
  template: `
    <section class="section">
      <div class="container">
        @if (loading()) { <div class="spinner"></div> }
        @else if (product()) {
          @if (product(); as p) {
          <!-- Breadcrumb -->
          <nav class="crumbs" aria-label="Breadcrumb">
            <a routerLink="/">Home</a>
            <span>›</span>
            @if (catSlug(p)) {
              <a [routerLink]="['/shop']" [queryParams]="{ category: catSlug(p) }">{{ catName(p) }}</a>
              <span>›</span>
            }
            <span class="current">{{ p.name }}</span>
          </nav>

          <div class="detail" style="position:relative;">
            <!-- ---------------- gallery ---------------- -->
            <div class="gallery" style="position:relative;">
              @if (isVideoActive() && p.video) {
                <div class="main-video-box">
                  <video [src]="p.video | mediaUrl" controls autoplay playsinline class="main-video-player"></video>
                  <button class="back-to-photo-btn" (click)="isVideoActive.set(false)">
                    📷 Back to photos
                  </button>
                </div>
              } @else {
                <div
                  class="main-wrap"
                  [class.zooming]="zooming()"
                  (mouseenter)="zoomOn()"
                  (mouseleave)="zoomOff()"
                  (mousemove)="zoomMove($event)"
                >
                  <img
                    [src]="(active() | mediaUrl) || fallback"
                    [alt]="p.name"
                    class="main-img"
                    appImgFallback
                  />
                  @if (zooming()) {
                    <div class="amazon-lens" [ngStyle]="lensStyle()" aria-hidden="true"></div>
                  }
                  @if (discount(p) > 0) { <span class="off-tag">-{{ discount(p) }}%</span> }
                </div>
              }

              @if (p.images.length > 1 || p.video) {
                <div class="thumbs">
                  @for (img of p.images; track img; let i = $index) {
                    <button
                      class="thumb"
                      [class.on]="!isVideoActive() && img === active()"
                      (click)="selectImage(img)"
                      [attr.aria-label]="'View photo ' + (i + 1) + ' of ' + p.images.length"
                      [attr.aria-pressed]="!isVideoActive() && img === active()"
                    >
                      <img [src]="img | mediaUrl" alt="" appImgFallback />
                    </button>
                  }
                  @if (p.video) {
                    <button
                      class="thumb video-thumb"
                      [class.on]="isVideoActive()"
                      (click)="selectVideo()"
                      [attr.aria-label]="'Watch product video'"
                      [attr.aria-pressed]="isVideoActive()"
                      title="Watch product video"
                    >
                      <div class="vid-thumb-icon">▶</div>
                      <span class="vid-thumb-label">Video</span>
                    </button>
                  }
                </div>
              }
              <button class="wish" [class.on]="saved.has(p._id)" (click)="saved.toggle(p)">
                {{ saved.has(p._id) ? '♥ Saved to wishlist' : '♡ Add to wishlist' }}
              </button>

              <!-- Amazon Side Zoom Flyout Window -->
              @if (zooming() && !isVideoActive()) {
                <div class="amazon-zoom-window">
                  <div class="zoom-header">🔍 Zoomed View</div>
                  <div class="zoom-img-box" [style.backgroundImage]="'url(' + ((active() | mediaUrl) || fallback) + ')'" [ngStyle]="zoomWindowStyle()"></div>
                </div>
              }
            </div>

            <!-- ---------------- main info ---------------- -->
            <div class="info">
              <h1>{{ p.name }}</h1>
              <div class="sub">
                Brand:
                <a class="brand-link" [routerLink]="['/shop']" [queryParams]="{ search: p.brand }">{{ p.brand }}</a>
              </div>

              <div class="rating-row">
                <span class="stars" [attr.aria-label]="'Rated ' + (p.rating | number:'1.1-1') + ' out of 5'">{{ stars(p.rating) }}</span>
                <button type="button" class="review-jump" (click)="scrollToReviews()">
                  {{ p.numReviews }} {{ p.numReviews === 1 ? 'Rating' : 'Ratings' }}
                </button>
                <span class="divider"></span>
                <button type="button" class="review-jump" (click)="scrollToReviews()">Write a review</button>
              </div>

              <div class="price-box">
                <div class="price-row">
                  <span class="price big">Rs {{ p.price | number }}</span>
                  @if (p.compareAtPrice > p.price) {
                    <span class="strike">Rs {{ p.compareAtPrice | number }}</span>
                    <span class="save">-{{ discount(p) }}%</span>
                  }
                </div>
              </div>

              @if (p.colors?.length) {
                <div class="opt">
                  <div class="opt-label">
                    Colour Family:
                    <strong>{{ selectedColor()?.name || 'Please select' }}</strong>
                  </div>
                  <div class="tiles" role="radiogroup" aria-label="Choose a colour">
                    @for (c of p.colors; track c.name) {
                      <button
                        type="button"
                        class="tile"
                        role="radio"
                        [class.on]="selectedColor()?.name === c.name"
                        [attr.aria-checked]="selectedColor()?.name === c.name"
                        (click)="pickColor(c)"
                      >
                        @if (c.image) {
                          <img class="tile-shot" [src]="c.image | mediaUrl" [alt]="c.name" appImgFallback />
                        } @else {
                          <img class="tile-dot" [src]="c.hex | swatch" alt="" />
                        }
                        <span>{{ c.name }}</span>
                      </button>
                    }
                  </div>
                  @if (colorError()) { <div class="color-error">Please select a colour first.</div> }
                </div>
              }

              <div class="opt">
                <div class="opt-label">Quantity:</div>
                <div class="qty-row">
                  <div class="qty">
                    <button [disabled]="qty() <= 1" (click)="qty.set(Math.max(1, qty()-1))">−</button>
                    <span>{{ qty() }}</span>
                    <button [disabled]="qty() >= p.stock" (click)="qty.set(Math.min(p.stock, qty()+1))">+</button>
                  </div>
                  @if (p.stock <= 0) {
                    <span class="stock out">Out of stock</span>
                  }
                </div>
              </div>

              @if (p.stock > 0) {
                <div class="cta">
                  <button class="btn btn-mint cta-btn" (click)="buyNow(p)">Buy Now</button>
                  <button class="btn btn-primary cta-btn" (click)="addToCart(p)">Add to Cart</button>
                </div>
                @if (added()) {
                  <div class="alert alert-success mt">
                    Added to your cart! 🎉
                    @if (selectedColor(); as c) { <strong>({{ c.name }})</strong> }
                  </div>
                }
                @if (stockError()) {
                  <div class="alert alert-error mt">
                    All {{ p.stock }} in stock {{ p.stock === 1 ? 'is' : 'are' }} already in your cart.
                  </div>
                }
              } @else {
                <div class="alert alert-error mt">This product is currently out of stock.</div>
              }
            </div>

            <!-- ---------------- delivery / service / seller ---------------- -->
            <aside class="side">
              <div class="side-card">
                <h4>Delivery</h4>
                <div class="side-row">
                  <span class="ico">📍</span>
                  <div><strong>Delivered across Pakistan</strong><em>Enter your address at checkout</em></div>
                </div>
                <div class="side-row">
                  <span class="ico">🚚</span>
                  <div><strong>Standard delivery — Rs {{ shippingFee | number }}</strong><em>Dispatched within 24 hours</em></div>
                </div>
                <div class="side-row">
                  <span class="ico">💵</span>
                  <div><strong>Cash on delivery available</strong><em>Pay when your order arrives</em></div>
                </div>
              </div>

              <div class="side-card">
                <h4>Service</h4>
                <div class="side-row">
                  <span class="ico">↩️</span>
                  <div><strong>7 days easy return</strong><em>Change of mind is not accepted</em></div>
                </div>
                <div class="side-row">
                  <span class="ico">🛡️</span>
                  <div><strong>Warranty not available</strong><em>Damaged items replaced free</em></div>
                </div>
              </div>

              <div class="side-card">
                <h4>Sold by</h4>
                <div class="seller">
                  <span class="seller-mark">🎒</span>
                  <div>
                    <strong>{{ p.brand }}</strong>
                    <em>Official store</em>
                  </div>
                </div>
                <div class="seller-stats">
                  <div><b>{{ p.rating | number:'1.1-1' }}</b><span>Product rating</span></div>
                  <div><b>{{ p.unitsSold | number }}</b><span>Units sold</span></div>
                  <div><b>24h</b><span>Dispatch time</span></div>
                </div>
                <a class="btn btn-ghost btn-sm btn-block" routerLink="/shop">Visit store</a>
              </div>
            </aside>
          </div>

          <!-- ---------------- details + specification ---------------- -->
          <div class="panels">
            <div class="panel card">
              <h2>Product details of {{ p.name }}</h2>
              <!-- Rich text from the admin editor. Angular sanitises innerHTML,
                   and the API sanitises again before storing. -->
              <div class="desc rich" [innerHTML]="p.description"></div>
            </div>
            <div class="panel card">
              <h2>Specifications</h2>
              <table class="specs">
                <tbody>
                  <tr><th>Brand</th><td>{{ p.brand }}</td></tr>
                  <tr><th>Category</th><td>{{ catName(p) }}</td></tr>
                  @if (p.colors?.length) {
                    <tr><th>Colour family</th><td>{{ colorNames(p) }}</td></tr>
                  }
                  <tr><th>Availability</th><td>{{ p.stock > 0 ? p.stock + ' in stock' : 'Out of stock' }}</td></tr>
                  <tr><th>SKU</th><td class="sku">{{ p.slug }}</td></tr>
                </tbody>
              </table>
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
    /* ---- breadcrumb ---- */
    .crumbs { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:.85rem; color: var(--muted); margin-bottom:16px; }
    .crumbs a { font-weight:700; }
    .crumbs a:hover { color: var(--brand); text-decoration:underline; }
    .crumbs .current { color: var(--ink); font-weight:700; }

    /* ---- three columns: gallery | info | delivery ---- */
    .detail { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1.05fr) 300px; gap:26px; align-items:start; }

    /* Deliberately NOT sticky. The gallery is taller than the buy box, so
       pinning it left the picture frozen while the rest of the page scrolled
       underneath it — the whole page should move as one piece. */
    .gallery { position:relative; width: 100%; }
    .main-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: var(--radius);
      border: 1px solid var(--line);
      background: #ffffff;
      overflow: hidden;
      cursor: crosshair;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-sm);
    }
    .main-img {
      width: 100%;
      height: 100%;
      aspect-ratio: 1 / 1;
      object-fit: contain;
      display: block;
      padding: 12px;
    }

    /* Amazon Target Lens Overlay */
    .amazon-lens {
      position: absolute; z-index: 4; pointer-events: none;
      background: rgba(1, 98, 241, 0.15); border: 2px solid var(--brand);
      box-shadow: 0 0 0 2000px rgba(15, 23, 42, 0.18);
      border-radius: 4px;
    }

    /* Amazon Side Zoom Flyout Window */
    .amazon-zoom-window {
      position: absolute; z-index: 100; left: calc(100% + 20px); top: 0;
      width: clamp(380px, 42vw, 550px); height: clamp(380px, 42vw, 550px);
      background: #fff; border: 2px solid var(--line); border-radius: var(--radius);
      box-shadow: 0 16px 50px rgba(15, 23, 42, 0.22); overflow: hidden;
      display: flex; flex-direction: column; animation: amazonZoomFade .15s ease;
    }
    .zoom-header {
      background: var(--cream-deep); padding: 8px 14px; font-family: var(--font-display);
      font-size: .82rem; font-weight: 700; color: var(--muted); border-bottom: 1px solid var(--line);
      display: flex; align-items: center; gap: 6px; flex: none;
    }
    .zoom-img-box {
      flex: 1; width: 100%; height: 100%; background-repeat: no-repeat; background-color: #fff;
    }
    @keyframes amazonZoomFade { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: scale(1); } }

    @media (max-width: 1080px) {
      .amazon-zoom-window, .amazon-lens { display: none !important; }
    }
    @media not all and (hover: hover) { .amazon-lens, .amazon-zoom-window { display: none !important; } }
    /* line-height is explicit because .main-wrap sets it to 0 (to kill the
       inline gap under the photo) and this span would otherwise inherit it and
       collapse to a sliver. */
    .off-tag { position:absolute; top:12px; left:12px; z-index:2; background: #CC0C39; color:#fff;
      font-family: var(--font-display); font-weight:800; font-size:1.1rem; line-height:1.25;
      padding:6px 14px; border-radius:999px; text-align:center; display:inline-flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(204, 12, 57, 0.35); }
    .thumbs { display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
    .thumb { width:64px; height:64px; padding:0; border-radius:10px; cursor:pointer; overflow:hidden;
      border:2px solid var(--line); background:#fff; transition: border-color .15s; }
    .thumb:hover { border-color: var(--sky); }
    .thumb.on { border-color: var(--brand); }
    .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
    .main-video-box {
      position: relative; width: 100%; border-radius: var(--radius); overflow: hidden;
      background: #000; box-shadow: var(--shadow-sm); aspect-ratio: 1 / 1; display: flex;
      align-items: center; justify-content: center;
    }
    .main-video-player { width: 100%; height: 100%; object-fit: contain; background: #000; }
    .back-to-photo-btn {
      position: absolute; top: 12px; right: 12px; z-index: 10;
      background: rgba(15, 23, 42, 0.8); color: #fff; border: 1px solid rgba(255,255,255,0.3);
      border-radius: 999px; padding: 6px 14px; font-family: var(--font-display);
      font-size: .85rem; font-weight: 700; cursor: pointer; backdrop-filter: blur(4px);
      transition: background .15s ease, transform .15s ease;
    }
    .back-to-photo-btn:hover { background: rgba(15, 23, 42, 0.95); transform: translateY(-1px); }

    .video-thumb {
      background: #1e293b; color: #fff; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 2px; border: 2px solid var(--line);
    }
    .video-thumb.on { border-color: var(--brand); background: #0f172a; }
    .vid-thumb-icon { font-size: 1.1rem; line-height: 1; color: #facc15; }
    .vid-thumb-label { font-size: .72rem; font-weight: 800; font-family: var(--font-display); letter-spacing: .5px; }

    /* Carries the same light-blue chip as the navbar wishlist and the Saved /
       Deals pills, so the save action looks like one thing across the site.
       It used to sit at rest as a grey ghost, which read as disabled. */
    .wish { margin-top:14px; width:100%; background: var(--sun-soft); border:2px solid var(--sun); border-radius:999px; padding:11px;
      font-family: var(--font-display); font-weight:800; font-size:.98rem; color: var(--sun-ink); cursor:pointer;
      transition: background .15s, color .15s, border-color .15s; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
    .wish:hover, .wish.on { color: var(--sun-ink); border-color: var(--sun-deep); background:#fde68a; }

    /* ---- middle column ---- */
    .info h1 { font-size:1.6rem; line-height:1.3; margin:0 0 6px; }
    .sub { font-size:.86rem; color: var(--muted); }
    .brand-link { color: var(--ink); font-weight:800; }
    .brand-link:hover { text-decoration:underline; }
    .rating-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:10px 0 14px; }
    .stars { color:var(--sun-deep); letter-spacing:2px; }
    .divider { width:1px; height:14px; background: var(--line); }
    .review-jump { color: var(--ink); font-weight:700; font-size:.85rem; cursor:pointer; background:none; border:none; padding:0; text-decoration:none; font-family:inherit; }
    .review-jump:hover { color: var(--brand); text-decoration:underline; }

    .price-box { background: var(--cream); border-radius: var(--radius-sm); padding:14px 16px; margin-bottom:18px; }
    .price-row { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .price.big { font-size:2rem; color: #000000; font-weight:800; }
    .save { color: #CC0C39; font-size: 1.65rem; font-weight: 800; text-align: center; display: inline-flex; align-items: center; justify-content: center; background: #fff1f2; padding: 4px 14px; border-radius: 8px; }

    .opt { padding:12px 0; border-top:1px solid var(--line); }
    .opt-label { font-size:.86rem; color: var(--muted); margin-bottom:10px; }
    .opt-label strong { color: var(--ink); font-family: var(--font-display); margin-left:4px; }
    .tiles { display:flex; flex-wrap:wrap; gap:8px; }
    .tile { display:flex; align-items:center; gap:8px; padding:6px 12px 6px 6px; cursor:pointer;
      background:#fff; border:2px solid var(--line); border-radius: var(--radius-sm);
      font-family: var(--font-body); font-weight:700; font-size:.86rem; color: var(--ink); transition: border-color .15s; }
    .tile:hover { border-color: var(--sky); }
    .tile.on { border-color: var(--brand); background: var(--brand-soft); }
    /* Own border so a white/clear swatch stays visible against the tile. */
    .tile-dot { width:22px; height:22px; border-radius:50%; border:1px solid rgba(0,0,0,.15); display:block; flex:none; }
    .tile-shot { width:30px; height:30px; border-radius:6px; object-fit:cover; display:block; flex:none;
      border:1px solid rgba(0,0,0,.12); }
    .color-error { color: var(--danger); font-weight:700; font-size:.88rem; margin-top:8px; }

    .qty-row { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .qty { display:flex; align-items:center; border:2px solid var(--line); border-radius: var(--radius-sm); overflow:hidden; }
    .qty button { width:40px; height:40px; border:none; background:#fff; font-size:1.2rem; cursor:pointer; color: var(--ink); }
    .qty button:disabled { color: var(--line); cursor:not-allowed; }
    .qty span { width:46px; text-align:center; font-weight:800; font-family: var(--font-display); }
    .stock { font-weight:700; font-size:.86rem; }
    .stock.in { color: var(--success); }
    .stock.out { color: var(--danger); }

    .cta { display:flex; gap:10px; margin-top:18px; align-items:center; flex-wrap:wrap; }
    .cta-btn { flex:1; min-width:130px; }
    .wish-btn { 
      background: var(--sun-soft); color: var(--sun-ink); border: 2px solid var(--sun); 
      border-radius: 999px; padding: 12px 18px; font-family: var(--font-display); 
      font-weight: 700; font-size: .95rem; cursor: pointer; transition: all .15s ease; 
      white-space: nowrap; flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; 
    }
    .wish-btn:hover, .wish-btn.on { background: #fde68a; color: var(--sun-ink); border-color: var(--sun-deep); }
    .desc { color: var(--muted); line-height:1.7; }
    /* The .rich article styles live in global styles.css, NOT here. Angular
       scopes component CSS with _ngcontent attributes, and markup injected via
       [innerHTML] never receives them — scoped rules simply would not apply. */

    /* ---- right column ---- */
    .side { display:flex; flex-direction:column; gap:14px; }
    .side-card { background:#fff; border:1px solid var(--line); border-radius: var(--radius); padding:16px; }
    .side-card h4 { font-size:.95rem; margin:0 0 12px; }
    .side-row { display:flex; gap:10px; padding:8px 0; border-top:1px solid var(--line); }
    .side-card .side-row:first-of-type { border-top:none; padding-top:0; }
    .side-row .ico { font-size:1.1rem; line-height:1.4; flex:none; }
    .side-row strong { display:block; font-size:.85rem; font-family: var(--font-body); }
    .side-row em { display:block; font-style:normal; font-size:.78rem; color: var(--muted); }
    .seller { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
    .seller-mark { width:40px; height:40px; border-radius:12px; background: var(--soft); display:grid; place-items:center; font-size:1.3rem; flex:none; }
    .seller strong { display:block; font-family: var(--font-display); }
    .seller em { font-style:normal; font-size:.78rem; color: var(--muted); }
    .seller-stats { display:grid; grid-template-columns: repeat(3,1fr); gap:6px; text-align:center; padding:12px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); margin-bottom:12px; }
    .seller-stats b { display:block; font-family: var(--font-display); font-size:1rem; }
    .seller-stats span { font-size:.68rem; color: var(--muted); line-height:1.3; display:block; }

    /* ---- details + specs ---- */
    /* start, not stretch — a short description shouldn't inherit the height of
       the specs table beside it and leave a tall empty card. */
    .panels { display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:26px; align-items:start; }
    .panel { padding:22px; }
    .panel h2 { font-size:1.15rem; margin:0 0 12px; }
    .specs { width:100%; border-collapse:collapse; font-size:.9rem; }
    .specs th, .specs td { text-align:left; padding:9px 10px; vertical-align:top; }
    .specs th { width:42%; color: var(--muted); font-weight:700; background: var(--cream); border-radius:8px 0 0 8px; }
    .specs tr + tr th, .specs tr + tr td { border-top:1px solid var(--line); }
    .sku { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:.82rem; word-break:break-all; }

    /* ---- reviews ---- */
    .reviews { margin-top:40px; }
    .reviews h2 { font-size:1.6rem; margin:0 0 18px; }
    .rev-top { display:grid; grid-template-columns: 180px 1fr; gap:28px; align-items:center;
      padding-bottom:22px; border-bottom:1px solid var(--line); }
    .rev-score { text-align:center; }
    .big-score { font-family: var(--font-display); font-size:3rem; font-weight:800; line-height:1; }
    .stars.big { color:var(--sun-deep); font-size:1.2rem; letter-spacing:3px; margin:6px 0 2px; }
    .stars.small { color:var(--sun-deep); font-size:.9rem; letter-spacing:1px; }
    .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; font-size:.88rem; }
    .bar-label { width:38px; color: var(--muted); white-space:nowrap; }
    .bar { flex:1; height:9px; background: var(--cream-deep); border-radius:99px; overflow:hidden; }
    .fill { height:100%; background:var(--sun-deep); border-radius:99px; transition: width .3s ease; }
    .bar-count { width:26px; text-align:right; color: var(--muted); }

    .write { padding:22px 0; border-bottom:1px solid var(--line); }
    .write h3 { margin:0 0 12px; }
    .write textarea { resize:vertical; }
    .star-picker { display:flex; align-items:center; gap:2px; margin-bottom:12px; }
    .star-btn { background:none; border:none; font-size:1.8rem; line-height:1; cursor:pointer; color: var(--line); padding:0 2px; transition: color .12s, transform .12s; }
    .star-btn.on { color:var(--sun-deep); }
    .star-btn:hover { transform: scale(1.15); }
    .picker-label { margin-left:10px; font-size:.9rem; }
    .write-actions { display:flex; gap:10px; margin-top:12px; }
    .link { color: var(--ink); font-weight:700; }

    .rev-list { display:flex; flex-direction:column; }
    .rev { padding:18px 0; border-bottom:1px solid var(--line); }
    .rev:last-child { border-bottom:none; }
    .rev-head { display:flex; align-items:flex-start; gap:12px; }
    .avatar { width:40px; height:40px; border-radius:50%; background: var(--soft); color:var(--ink);
      display:grid; place-items:center; font-weight:800; font-family: var(--font-display); flex-shrink:0; }
    .badge.verified { background:#dff5ec; color:#2f855a; margin-left:8px; font-size:.7rem; }
    .rev-body { margin:10px 0 0 52px; color: var(--muted); line-height:1.6; }
    .rev-del { margin-left:auto; background:none; border:none; color: var(--muted); cursor:pointer; font-size:1rem; padding:4px 6px; border-radius:8px; }
    .rev-del:hover { color: var(--danger); background: var(--cream); }

    /* The delivery column folds under the other two first, then everything
       stacks — the gallery and buy box stay side by side as long as they fit. */
    @media (max-width: 1080px) {
      .detail { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
      .side { grid-column: 1 / -1; flex-direction:row; flex-wrap:wrap; }
      .side-card { flex:1 1 260px; }
    }
    @media (max-width: 800px) {
      .detail { grid-template-columns: 1fr; gap:24px; }
      .panels { grid-template-columns: 1fr; }
      .cta {
        position: sticky; bottom: 0; background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px); padding: 10px 0; z-index: 5;
        border-top: 1px solid var(--line);
      }
      .rev-top { grid-template-columns: 1fr; gap:16px; }
      .rev-body { margin-left:0; }
    }
  `],
})
export class ProductDetailComponent implements OnInit {
  product = signal<Product | null>(null);
  loading = signal(true);
  active = signal<string>('');
  isVideoActive = signal(false);
  qty = signal(1);
  added = signal(false);

  selectImage(img: string) {
    this.isVideoActive.set(false);
    this.active.set(img);
  }

  selectVideo() {
    this.isVideoActive.set(true);
    this.zooming.set(false);
  }

  // --- Amazon Magnifier Zoom ---
  zooming = signal(false);
  lensStyle = signal<Record<string, string>>({});
  zoomWindowStyle = signal<Record<string, string>>({});

  private readonly lensWidth = 150;
  private readonly lensHeight = 150;
  private readonly zoomFactor = 2.8;
  // Deliberately starts empty: a colour is the customer's choice to make, not
  // one to inherit from whichever colour happens to be listed first.
  selectedColor = signal<ProductColor | null>(null);
  colorError = signal(false);
  /** Set when the cart already holds every unit this product has in stock. */
  stockError = signal(false);
  Math = Math;
  fallback = FALLBACK_IMAGE;
  /** Mirrors SHIPPING_FEE in the API's order controller. */
  readonly shippingFee = 250;

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
    public saved: SavedService,
    private router: Router,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug')!;
      this.loading.set(true);
      this.productSvc.getBySlug(slug).subscribe({
        next: (p) => {
          this.product.set(p);
          this.active.set(p.images?.[0] || '');
          // Preselect the first colour so Add to Cart works straight away rather
          // than bouncing off "Please select a colour first". Set fresh on every
          // product — navigating must not carry the previous choice over.
          this.selectedColor.set(p.colors?.length ? p.colors[0] : null);
          this.colorError.set(false);
          this.qty.set(1);
          this.loading.set(false);
        },
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

  /**
   * A tap on a touch screen still fires mouseenter/mousemove, but never a
   * matching mouseleave — so without this the lens would appear on tap and stay
   * stuck on the photo with no way to dismiss it.
   */
  private canZoom() {
    return typeof window !== 'undefined'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  zoomOn() { if (this.canZoom()) this.zooming.set(true); }

  zoomOff() { this.zooming.set(false); }

  /**
   * Park the lens over the cursor and pick the slice of the photo it should
   * show. The offsets have to reproduce what `object-fit: cover` did to the
   * <img>, otherwise a photo that isn't square would appear stretched inside
   * the glass relative to the picture underneath it.
   */
  zoomMove(e: MouseEvent) {
    if (!this.canZoom()) return;
    const wrap = e.currentTarget as HTMLElement;
    const box = wrap.getBoundingClientRect();
    if (!box.width || !box.height) return;

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    const mouseX = e.clientX - box.left;
    const mouseY = e.clientY - box.top;

    const lensX = clamp(mouseX - this.lensWidth / 2, 0, box.width - this.lensWidth);
    const lensY = clamp(mouseY - this.lensHeight / 2, 0, box.height - this.lensHeight);

    this.lensStyle.set({
      left: `${lensX}px`,
      top: `${lensY}px`,
      width: `${this.lensWidth}px`,
      height: `${this.lensHeight}px`,
    });

    const Z = this.zoomFactor;
    const bgX = lensX * Z;
    const bgY = lensY * Z;
    const bgW = box.width * Z;
    const bgH = box.height * Z;

    this.zoomWindowStyle.set({
      backgroundPosition: `-${bgX}px -${bgY}px`,
      backgroundSize: `${bgW}px ${bgH}px`,
    });
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

  /**
   * Choosing a colour also shows it: the gallery jumps to that colour's photo
   * when one exists, and otherwise stays where it is rather than blanking.
   */
  pickColor(c: ProductColor) {
    this.selectedColor.set(c);
    this.colorError.set(false);
    if (c.image) {
      this.isVideoActive.set(false);
      this.active.set(c.image);
    }
  }

  /**
   * @returns false when a required colour hasn't been chosen, or when the cart
   *          already holds this product's whole stock across its colours.
   */
  private putInCart(p: Product): boolean {
    if (p.colors?.length && !this.selectedColor()) {
      this.colorError.set(true);
      return false;
    }
    this.colorError.set(false);
    if (!this.cart.add(p, this.qty(), this.selectedColor())) {
      this.stockError.set(true);
      return false;
    }
    this.stockError.set(false);
    return true;
  }

  addToCart(p: Product) {
    if (!this.putInCart(p)) return;
    this.added.set(true);
    setTimeout(() => this.added.set(false), 2500);
  }

  /** Same as adding, but takes them straight to checkout. */
  buyNow(p: Product) {
    if (!this.putInCart(p)) return;
    this.router.navigate(['/checkout']);
  }

  discount(p: Product) {
    // Guards the 0 case — compareAtPrice defaults to 0, which would divide to
    // -Infinity and render a nonsense discount badge.
    if (!p.compareAtPrice || p.compareAtPrice <= p.price) return 0;
    return Math.round((1 - p.price / p.compareAtPrice) * 100);
  }
  catName(p: Product) { return typeof p.category === 'object' ? p.category.name : '—'; }
  catSlug(p: Product) { return typeof p.category === 'object' ? p.category.slug : ''; }
  colorNames(p: Product) { return (p.colors || []).map((c) => c.name).join(', '); }
}
