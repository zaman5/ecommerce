import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService, CategoryService, UploadService, SettingsService } from '../../../core/services/api.service';
import { Category, Product, ProductColor, SocialSettings } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { SwatchPipe } from '../../../shared/pipes/swatch.pipe';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor.component';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminNavComponent, ImgFallbackDirective, MediaUrlPipe, SwatchPipe, RichTextEditorComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />
        <div class="head">
          <div><h1>Products</h1><p class="text-muted">Add, edit and manage your catalogue.</p></div>
          <button class="btn btn-primary" (click)="openNew()">+ Add product</button>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          <div class="card table-wrap mt">
            <table class="table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sold</th><th>Status</th><th></th></tr></thead>
              <tbody>
                @for (p of products(); track p._id) {
                  <tr>
                    <td>
                      <div class="prod"><img [src]="(p.images[0] | mediaUrl) || fallback" [alt]="p.name" appImgFallback /><span>{{ p.name }}</span></div>
                    </td>
                    <td>{{ catName(p) }}</td>
                    <td class="price">Rs {{ p.price | number }}</td>
                    <td><span [class.low]="p.stock <= 5">{{ p.stock }}</span></td>
                    <td>{{ p.unitsSold }}</td>
                    <td><span class="status" [class]="p.isActive ? 'status-delivered' : 'status-cancelled'">{{ p.isActive ? 'Active' : 'Hidden' }}</span></td>
                    <td class="actions">
                      <button class="icon-btn" (click)="openQuickShare(p)" title="Post to Facebook & Instagram">📢</button>
                      <button class="icon-btn" (click)="edit(p)" title="Edit">✏️</button>
                      <button class="icon-btn" (click)="remove(p)" title="Delete">🗑️</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>

    <!-- Quick Share Modal -->
    @if (showQuickShareModal() && sharingProduct(); as prod) {
      <div class="overlay" (click)="closeQuickShare()">
        <div class="modal card quick-share-box" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>📢 Share to Social Media</h2>
            <button class="icon-btn" (click)="closeQuickShare()">✕</button>
          </div>
          @if (sharingSuccessMessage()) { <div class="alert alert-success m-pad">{{ sharingSuccessMessage() }}</div> }
          @if (sharingErrorMessage()) { <div class="alert alert-error m-pad">{{ sharingErrorMessage() }}</div> }
          <div class="modal-body">
            <div class="quick-prod-card">
              <img [src]="(prod.images[0] | mediaUrl) || fallback" [alt]="prod.name" appImgFallback class="quick-prod-thumb" />
              <div>
                <strong class="quick-prod-title">{{ prod.name }}</strong>
                <div class="text-muted quick-prod-meta">Rs {{ prod.price | number }} · {{ catName(prod) }}</div>
              </div>
            </div>

            @if (!socialConfigured()) {
              <div class="social-panel-notice mt">
                <span>⚠️ Facebook & Instagram credentials are not configured yet.</span>
                <a routerLink="/admin/social" (click)="closeQuickShare()">Open Social Settings &rarr;</a>
              </div>
            }

            <div class="field mt">
              <label>Select Destinations</label>
              <div class="social-checkboxes">
                <label class="social-btn" [class.on]="quickShareFb">
                  <input type="checkbox" [(ngModel)]="quickShareFb" [ngModelOptions]="{standalone:true}" />
                  <span class="soc-icon fb">📘</span>
                  <span class="soc-name">Facebook Page</span>
                </label>

                <label class="social-btn" [class.on]="quickShareIg">
                  <input type="checkbox" [(ngModel)]="quickShareIg" [ngModelOptions]="{standalone:true}" />
                  <span class="soc-icon ig">📸</span>
                  <span class="soc-name">Instagram Feed</span>
                </label>
              </div>
            </div>

            <div class="field mt">
              <label>Custom Caption <span class="hint">(optional — leave blank for default)</span></label>
              <textarea class="input" rows="4" [(ngModel)]="quickShareMessage" [ngModelOptions]="{standalone:true}" placeholder="Leave empty to use default caption template..."></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="closeQuickShare()">Cancel</button>
            <button class="btn btn-primary" [disabled]="isSharingNow() || (!quickShareFb && !quickShareIg)" (click)="submitQuickShare()">
              {{ isSharingNow() ? 'Publishing…' : '🚀 Publish Now' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal -->
    @if (showForm()) {
      <div class="overlay" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>{{ editing() ? 'Edit product' : 'Add product' }}</h2>
            <button class="icon-btn" (click)="close()">✕</button>
          </div>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="modal-body">
            <div class="field"><label>Name</label><input class="input" [(ngModel)]="form.name" /></div>
            <div class="field">
              <label>Description</label>
              <app-rich-text [(ngModel)]="form.description" [ngModelOptions]="{standalone:true}"
                             placeholder="Describe the product — use the toolbar for headings, bold and lists." />
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Brand</label><input class="input" [(ngModel)]="form.brand" /></div>
              <div class="field"><label>Category</label>
                <select class="input" [(ngModel)]="form.category">
                  <option value="">Select…</option>
                  @for (c of departments(); track c._id) {
                    <optgroup [label]="c.name">
                      <option [value]="c._id">{{ c.name }} (whole department)</option>
                      @for (s of subsOf(c.slug); track s._id) { <option [value]="s._id">{{ s.name }}</option> }
                    </optgroup>
                  }
                </select>
              </div>
            </div>
            <!-- Enter the normal price and the discount off it; the selling
                 price is worked out below rather than by the admin. -->
            <div class="grid grid-2">
              <div class="field">
                <label>Price (Rs) <span class="hint">— the normal price, before any discount</span></label>
                <input class="input" type="number" min="0" [(ngModel)]="form.price" />
              </div>
              <div class="field">
                <label>Discount</label>
                <div class="disc-row">
                  <select class="input" [(ngModel)]="discountMode" [ngModelOptions]="{standalone:true}">
                    <option value="none">No discount</option>
                    <option value="amount">Rs off</option>
                    <option value="percent">% off</option>
                  </select>
                  @if (discountMode !== 'none') {
                    <input class="input disc-val" type="number" min="0" [(ngModel)]="discountValue"
                           [ngModelOptions]="{standalone:true}"
                           [placeholder]="discountMode === 'amount' ? 'e.g. 500' : 'e.g. 20'" />
                  }
                </div>
              </div>
            </div>

            <!-- Only offered once there is a discount: the Flash Sale strip
                 shows a "was" price, so an undiscounted product has nothing to
                 advertise there. -->
            @if (discountMode !== 'none' && !discountProblem()) {
              <button
                type="button"
                class="flash-toggle"
                [class.on]="form.isFlashSale"
                [attr.aria-pressed]="form.isFlashSale"
                (click)="form.isFlashSale = !form.isFlashSale"
              >
                <span class="bolt">⚡</span>
                <span class="flash-text">
                  <strong>{{ form.isFlashSale ? 'In the Flash Sale' : 'Add to Flash Sale' }}</strong>
                  <em>
                    {{ form.isFlashSale
                        ? 'Showing in the deals strip at the top of the home page.'
                        : 'Feature this discount in the strip at the top of the home page.' }}
                  </em>
                </span>
                <span class="flash-state">{{ form.isFlashSale ? 'ON' : 'OFF' }}</span>
              </button>
              <p class="hint mt-sm">
                The strip's heading, countdown and button are set in
                <a routerLink="/admin/flash-sale" (click)="close()">Flash Sale settings</a>.
              </p>
            }

            <div class="price-summary" [class.bad]="discountProblem()">
              @if (discountProblem(); as problem) {
                <strong>{{ problem }}</strong>
              } @else if (discountMode === 'none') {
                Customers pay <strong>Rs {{ form.price | number }}</strong>. No “was” price is shown.
              } @else {
                Customers pay <strong>Rs {{ sellingPrice() | number }}</strong>
                · was <s>Rs {{ form.price | number }}</s>
                · <b>{{ discountPercent() }}% off</b>
                (saves Rs {{ savings() | number }})
              }
            </div>
            <div class="field"><label>Stock</label><input class="input" type="number" [(ngModel)]="form.stock" /></div>
            <div class="field">
              <label>Photos <span class="hint">— the first one is the main picture</span></label>
              @for (url of images; track $index) {
                <div class="img-row">
                  <span class="img-preview">
                    @if (images[$index]) {
                      <img [src]="images[$index] | mediaUrl" alt="" appImgFallback />
                    } @else { <span class="img-no">{{ $index + 1 }}</span> }
                  </span>
                  <input class="input" [ngModel]="images[$index]" (ngModelChange)="images[$index] = $event"
                         [ngModelOptions]="{standalone:true}" placeholder="Paste an image link (https://…)" />
                  <label class="upload-btn" [class.busy]="uploadingAt() === $index">
                    {{ uploadingAt() === $index ? '…' : '📁' }}
                    <input type="file" accept="image/*" hidden
                           (change)="uploadInto($index, $event)" [disabled]="uploadingAt() !== null" />
                  </label>
                  <button class="icon-btn" (click)="removeImage($index)" aria-label="Remove photo">🗑️</button>
                </div>
              }
              <button class="btn btn-ghost btn-sm" (click)="addImage()">+ Add photo</button>
              <p class="hint mt-sm">Paste a link, or use 📁 to upload a file from this computer (max 5MB).</p>
            </div>

            <div class="field">
              <label>Product Video <span class="hint">— optional video preview (MP4, WebM)</span></label>
              <div class="img-row">
                <span class="img-preview vid-icon">🎥</span>
                <input class="input" [(ngModel)]="form.video" placeholder="Paste a video URL or upload a file (MP4, WebM)" />
                <label class="upload-btn" [class.busy]="uploadingVideo()" title="Upload video file (max 50MB)">
                  {{ uploadingVideo() ? '…' : '📹' }}
                  <input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" hidden
                         (change)="uploadVideo($event)" [disabled]="uploadingVideo()" />
                </label>
                @if (form.video) {
                  <button class="icon-btn" (click)="form.video = ''" aria-label="Remove video" title="Remove video">✕</button>
                }
              </div>
              @if (form.video) {
                <div class="video-preview-wrap mt-sm">
                  <video [src]="form.video | mediaUrl" controls playsinline class="video-preview-player"></video>
                </div>
              }
              <p class="hint mt-sm">Upload a video file (max 50MB) or paste a direct video link. Customers can watch it directly in the gallery.</p>
            </div>

            <div class="field">
              <label>Colours <span class="hint">— leave empty for no colour choice</span></label>
              @for (c of colors; track $index) {
                <div class="colour-row">
                  <!-- Shows this colour's own photo when there is one, so it is
                       obvious at a glance which colours are still unphotographed. -->
                  <span class="img-preview" [class.empty]="!c.image">
                    @if (c.image) {
                      <img [src]="c.image | mediaUrl" [alt]="c.name" appImgFallback />
                    } @else {
                      <img class="chip" [src]="c.hex | swatch" alt="" />
                    }
                  </span>
                  <input class="input" [(ngModel)]="c.name" [ngModelOptions]="{standalone:true}" placeholder="Colour name (e.g. Navy)" />
                  <input class="input" [(ngModel)]="c.image" [ngModelOptions]="{standalone:true}" placeholder="Photo of this colour — paste a link or use 📁" />
                  <label class="upload-btn" [class.busy]="uploadingColorAt() === $index">
                    {{ uploadingColorAt() === $index ? '…' : '📁' }}
                    <input type="file" accept="image/*" hidden
                           (change)="uploadColorInto($index, $event)" [disabled]="uploadingColorAt() !== null" />
                  </label>
                  <input class="swatch-input" type="color" [(ngModel)]="c.hex" [ngModelOptions]="{standalone:true}" [attr.aria-label]="'Swatch for ' + (c.name || 'this colour')" />
                  <button class="icon-btn" (click)="removeColor($index)" aria-label="Remove colour">🗑️</button>
                </div>
              }
              <button class="btn btn-ghost btn-sm" (click)="addColor()">+ Add colour</button>
              <p class="hint mt-sm">
                Give a colour its own photo and the product page swaps the main picture to it when a
                shopper picks that colour, and shows it on the swatch. Without one the swatch falls
                back to the colour square and the main photo stays put — so only add a photo that is
                genuinely <em>that</em> colour of <em>this</em> product.
              </p>
            </div>
            <div class="flex gap">
              <label class="check"><input type="checkbox" [(ngModel)]="form.isFeatured" /> Featured</label>
              <label class="check"><input type="checkbox" [(ngModel)]="form.isActive" /> Active (visible in shop)</label>
            </div>

            <!-- Social Media Auto-Publish Section -->
            <div class="social-panel mt">
              <div class="social-panel-head">
                <span class="social-panel-icon">📢</span>
                <div>
                  <strong>Social Media Auto-Publish</strong>
                  <span class="social-panel-desc">Publish directly to your connected social channels when saving this product.</span>
                </div>
              </div>

              @if (!socialConfigured()) {
                <div class="social-panel-notice">
                  <span>ℹ️ Facebook & Instagram integration is not configured yet.</span>
                  <a routerLink="/admin/social" (click)="close()">Configure in Settings &rarr;</a>
                </div>
              }

              <div class="social-checkboxes">
                <label class="social-btn" [class.on]="postToFacebook()" [class.disabled]="!socialConfigured()">
                  <input type="checkbox" [ngModel]="postToFacebook()" (ngModelChange)="postToFacebook.set($event)" [ngModelOptions]="{standalone:true}" [disabled]="!socialConfigured()" />
                  <span class="soc-icon fb">📘</span>
                  <span class="soc-name">Post on Facebook Page</span>
                </label>

                <label class="social-btn" [class.on]="postToInstagram()" [class.disabled]="!socialConfigured()">
                  <input type="checkbox" [ngModel]="postToInstagram()" (ngModelChange)="postToInstagram.set($event)" [ngModelOptions]="{standalone:true}" [disabled]="!socialConfigured()" />
                  <span class="soc-icon ig">📸</span>
                  <span class="soc-name">Post on Instagram</span>
                </label>
              </div>

              @if ((postToFacebook() || postToInstagram()) && socialConfigured()) {
                <div class="social-caption-opt mt-xs">
                  <button type="button" class="btn-caption-toggle" (click)="showSocialDetails.set(!showSocialDetails())">
                    {{ showSocialDetails() ? '▼ Hide custom social caption' : '▶ Customize social caption (optional)' }}
                  </button>

                  @if (showSocialDetails()) {
                    <div class="mt-xs">
                      <textarea class="input soc-text" rows="3" [ngModel]="customSocialMessage()" (ngModelChange)="customSocialMessage.set($event)" [ngModelOptions]="{standalone:true}" placeholder="Leave empty to use your default template from Settings..."></textarea>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="close()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save product' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; }
    .prod { display:flex; align-items:center; gap:10px; }
    .prod img { width:42px; height:42px; object-fit:cover; border-radius:8px; }
    .low { color: var(--danger); font-weight:800; }
    .actions { white-space:nowrap; }
    .icon-btn { background:none; border:none; font-size:1.1rem; cursor:pointer; padding:4px; border-radius:8px; }
    .icon-btn:hover { background: var(--cream); }
    .overlay { position:fixed; inset:0; background:rgba(51,65,79,.5); display:grid; place-items:center; z-index:100; padding:20px; }
    .modal { width:min(640px,100%); max-height:90vh; display:flex; flex-direction:column; }
    .hint { font-weight:600; color: var(--muted); font-size:.82rem; }

    /* The mode picker and its value share one row; the value is narrower
       because it only ever holds a small number. */
    .disc-row { display:flex; gap:8px; }
    .disc-row select { flex:1; min-width:0; }
    .disc-row .disc-val { flex:0 0 110px; }
    /* Restates the result in the shopper's words, so the admin can see the
       maths landed before saving instead of checking the storefront. */
    /* A switch that reads as a switch: the whole row is the target, and the
       ON/OFF word states the setting for anyone who can't rely on the colour. */
    .flash-toggle { display:flex; align-items:center; gap:12px; width:100%; margin:0 0 12px;
      padding:12px 16px; border:2px solid var(--line); border-radius: var(--radius-sm);
      background:#fff; cursor:pointer; text-align:left; font-family: var(--font-body);
      transition: border-color .15s, background .15s; }
    .flash-toggle:hover { border-color: var(--brand); }
    .flash-toggle.on { border-color: var(--brand); background:#fff6f4; }
    .flash-toggle .bolt { font-size:1.3rem; filter:grayscale(1); opacity:.5; }
    .flash-toggle.on .bolt { filter:none; opacity:1; }
    .flash-text { flex:1; min-width:0; }
    .flash-text strong { display:block; font-family: var(--font-display); font-size:.95rem; }
    .flash-text em { font-style:normal; font-size:.82rem; color: var(--muted); }
    .flash-state { font-family: var(--font-display); font-weight:800; font-size:.75rem;
      padding:3px 10px; border-radius:999px; background: var(--line); color: var(--muted); }
    .flash-toggle.on .flash-state { background:#fff; color: var(--brand); border:1px solid var(--brand); box-shadow: var(--shadow-sm); padding:2px 9px; }
    .hint a { color: var(--ink); text-decoration:underline; }
    .hint a:hover { color: var(--brand); }

    .price-summary { margin:-4px 0 16px; padding:10px 14px; border-radius: var(--radius-sm);
      background: var(--soft); color:var(--ink); font-size:.88rem; font-weight:600; }
    .price-summary s { color:#6b8f89; }
    .price-summary b { color:#1f6b60; }
    .price-summary.bad { background:#ffe6e3; color:#c1352a; }
    .img-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .img-row .input { flex:1; min-width:0; }
    .img-preview { width:40px; height:40px; flex:none; border-radius:8px; overflow:hidden; background: var(--cream-deep);
      display:grid; place-items:center; border:1px solid var(--line); }
    .img-preview img { width:100%; height:100%; object-fit:cover; }
    .img-no { font-weight:800; color: var(--muted); font-size:.85rem; }
    .upload-btn { flex:none; width:40px; height:40px; display:grid; place-items:center; cursor:pointer;
      border:1px solid var(--line); border-radius:8px; background:#fff; font-size:1.05rem; }
    .upload-btn:hover { border-color: var(--brand); }
    .upload-btn.busy { opacity:.6; cursor:progress; }
    .colour-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .colour-row .input { flex:1; min-width:0; }
    /* A dashed edge marks a colour with no photo of its own, so the rows that
       still need one are obvious without reading each field. */
    .img-preview.empty { border:2px dashed var(--line); background:#fff; display:grid; place-items:center; }
    .img-preview.empty .chip { width:18px; height:18px; border-radius:50%; }
    .swatch-input { width:48px; height:44px; padding:2px; border:2px solid var(--line); border-radius: var(--radius-sm); background:#fff; cursor:pointer; flex:none; }
    .vid-icon { font-size:1.15rem; display:grid; place-items:center; background: var(--cream-deep); }
    .video-preview-wrap { max-width:320px; border-radius: var(--radius-sm); overflow:hidden; border:2px solid var(--line); background:#000; }
    .video-preview-player { width:100%; height:auto; max-height:180px; display:block; }
    @media (max-width:760px) {
      .colour-row { flex-wrap:wrap; }
      .colour-row .input { flex:1 1 100%; }
      .img-row { flex-wrap:wrap; }
      .img-row .input { flex:1 1 100%; }
    }
    .modal-head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--line); flex-shrink:0; }
    .modal-head h2 { margin:0; font-size:1.15rem; }
    .modal-body { padding:18px 20px; overflow-y:auto; flex:1; min-height:0; }
    .modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 20px; border-top:1px solid var(--line); flex-shrink:0; }
    .check { display:flex; align-items:center; gap:8px; font-weight:700; }
    .check input { accent-color: var(--ink); width:18px; height:18px; }

    /* Social Media Section & Quick Share */
    .m-pad { margin: 12px 20px 0; }
    .social-panel { background: #fdfdfd; border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 16px; }
    .social-panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .social-panel-icon { font-size: 1.2rem; }
    .social-panel-head strong { font-size: .95rem; display: block; }
    .social-panel-desc { font-size: .8rem; color: var(--muted); }
    .social-panel-notice { font-size: .82rem; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 6px 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
    .social-panel-notice a { color: #92400e; font-weight: 700; text-decoration: underline; }
    .social-checkboxes { display: flex; gap: 10px; flex-wrap: wrap; }
    .social-btn { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1.5px solid var(--line); border-radius: 10px; background: #fff; cursor: pointer; transition: all .15s ease; }
    .social-btn:hover:not(.disabled) { border-color: var(--brand); }
    .social-btn.on { border-color: var(--brand); background: #fff6f4; }
    .social-btn.disabled { opacity: .5; cursor: not-allowed; }
    .social-btn input { accent-color: var(--brand); width: 18px; height: 18px; }
    .soc-icon { font-size: 1.1rem; }
    .soc-name { font-weight: 700; font-size: .88rem; color: var(--ink); }
    .btn-caption-toggle { background: none; border: none; font-size: .82rem; font-weight: 700; color: var(--brand); cursor: pointer; padding: 0; }
    .soc-text { font-family: monospace; font-size: .84rem; }
    .quick-share-box { width: min(520px, 100%); }
    .quick-prod-card { display: flex; align-items: center; gap: 12px; background: var(--cream); border: 1px solid var(--line); padding: 10px 14px; border-radius: 10px; }
    .quick-prod-thumb { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid var(--line); }
    .quick-prod-title { font-size: .95rem; }
    .quick-prod-meta { font-size: .82rem; }
  `],
})
export class AdminProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editing = signal<Product | null>(null);
  saving = signal(false);
  error = signal('');
  fallback = FALLBACK_IMAGE;
  /** Full gallery, not just the main shot — saving only the first would wipe it. */
  images: string[] = [];
  form: any = this.blank();
  colors: ProductColor[] = [];

  /** Social media signals */
  postToFacebook = signal(false);
  postToInstagram = signal(false);
  socialConfigured = signal(false);
  socialSettings = signal<SocialSettings | null>(null);
  customSocialMessage = signal('');
  showSocialDetails = signal(false);

  /** Quick share modal signals */
  showQuickShareModal = signal(false);
  sharingProduct = signal<Product | null>(null);
  quickShareFb = true;
  quickShareIg = false;
  quickShareMessage = '';
  isSharingNow = signal(false);
  sharingSuccessMessage = signal('');
  sharingErrorMessage = signal('');

  /** Index of the photo slot currently uploading, or null. */
  uploadingAt = signal<number | null>(null);
  /** Index of the colour row currently uploading, or null. */
  uploadingColorAt = signal<number | null>(null);
  /** Whether video is currently uploading. */
  uploadingVideo = signal(false);

  constructor(
    private productSvc: ProductService,
    private catSvc: CategoryService,
    private uploads: UploadService,
    private settingsSvc: SettingsService
  ) {}

  ngOnInit() {
    this.catSvc.list().subscribe((c) => this.categories.set(c));
    this.reload();
    this.settingsSvc.getSocial().subscribe({
      next: (s) => {
        this.socialSettings.set(s);
        this.socialConfigured.set(Boolean(s.facebookPageId && s.facebookPageAccessToken));
      },
      error: () => {},
    });
  }
  reload() {
    this.loading.set(true);
    this.productSvc.adminAll().subscribe({
      next: (p) => { this.products.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  blank() {
    return { name: '', description: '', brand: 'Wondercart', category: '', price: 0, compareAtPrice: 0, stock: 0, video: '', isFeatured: false, isFlashSale: false, isActive: true };
  }

  /**
   * The catalogue stores a selling `price` and a struck-through
   * `compareAtPrice`, which meant an admin discounting Rs 500 off Rs 3,000 had
   * to type 2500 in one box and 3000 in the other and get the subtraction right
   * themselves. The form now takes the normal price plus the discount and
   * derives both stored fields — see toPayload().
   */
  discountMode: 'none' | 'amount' | 'percent' = 'none';
  discountValue = 0;

  /** What the customer actually pays. Rounded — prices are whole rupees. */
  sellingPrice(): number {
    const base = Number(this.form.price) || 0;
    if (this.discountMode === 'none') return base;
    const off = Number(this.discountValue) || 0;
    const cut = this.discountMode === 'amount' ? off : (base * off) / 100;
    return Math.max(0, Math.round(base - cut));
  }

  savings(): number {
    return Math.max(0, (Number(this.form.price) || 0) - this.sellingPrice());
  }

  /** The same rounding the product card uses, so the badge matches the form. */
  discountPercent(): number {
    const base = Number(this.form.price) || 0;
    if (base <= 0) return 0;
    return Math.round((1 - this.sellingPrice() / base) * 100);
  }

  /** Non-empty when the numbers don't make a sellable price. */
  discountProblem(): string | null {
    if (this.discountMode === 'none') return null;
    const base = Number(this.form.price) || 0;
    const v = Number(this.discountValue) || 0;
    if (base <= 0) return 'Enter a price before adding a discount.';
    if (v <= 0) return 'Discount value must be greater than zero.';
    if (this.discountMode === 'percent' && v >= 100) {
      return 'Discount percentage must be less than 100%.';
    }
    if (this.discountMode === 'amount' && v >= base) {
      return `Discount amount cannot be Rs ${base} or higher.`;
    }
    return null;
  }

  /** Splits the form's "price + discount" back into the two stored fields. */
  toPayload(): { price: number; compareAtPrice: number } {
    const normal = Number(this.form.price) || 0;
    if (this.discountMode === 'none') {
      return { price: normal, compareAtPrice: 0 };
    }
    return { price: this.sellingPrice(), compareAtPrice: normal };
  }

  /** Rebuilds "price + discount" from a stored product, so editing round-trips. */
  fromProduct(p: Product): number {
    const isDiscounted = (p.compareAtPrice || 0) > p.price;
    if (!isDiscounted) {
      this.discountMode = 'none';
      this.discountValue = 0;
      return p.price;
    }
    this.discountMode = 'amount';
    this.discountValue = p.compareAtPrice - p.price;
    return p.compareAtPrice;
  }
  /** Top-level departments — the picker nests sub-categories under these. */
  departments(): Category[] { return this.categories().filter((c) => !c.parent); }
  subsOf(parentSlug: string): Category[] { return this.categories().filter((c) => c.parent === parentSlug); }

  addColor() { this.colors.push({ name: '', hex: '#2563eb', image: '' }); }
  removeColor(i: number) { this.colors.splice(i, 1); }

  addImage() { this.images.push(''); }
  removeImage(i: number) { this.images.splice(i, 1); if (!this.images.length) this.images.push(''); }

  /** Uploads a photo of one colour and attaches it to that colour row. */
  uploadColorInto(i: number, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingColorAt.set(i);
    this.error.set('');
    this.uploads.image(file).subscribe({
      next: (r) => { this.colors[i].image = r.url; this.uploadingColorAt.set(null); input.value = ''; },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not upload that image.');
        this.uploadingColorAt.set(null);
        input.value = '';
      },
    });
  }

  /** Uploads the chosen file and drops the returned path into that photo slot. */
  uploadInto(i: number, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingAt.set(i);
    this.error.set('');
    this.uploads.image(file).subscribe({
      next: (r) => { this.images[i] = r.url; this.uploadingAt.set(null); input.value = ''; },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not upload that image.');
        this.uploadingAt.set(null);
        input.value = '';
      },
    });
  }

  /** Uploads a video file up to 50MB and stores its path. */
  uploadVideo(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingVideo.set(true);
    this.error.set('');
    this.uploads.video(file).subscribe({
      next: (r) => {
        this.form.video = r.url;
        this.uploadingVideo.set(false);
        input.value = '';
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not upload video.');
        this.uploadingVideo.set(false);
        input.value = '';
      },
    });
  }

  openNew() {
    this.editing.set(null);
    this.form = this.blank();
    this.discountMode = 'none';
    this.discountValue = 0;
    this.images = [''];
    this.colors = [];
    this.error.set('');
    this.postToFacebook.set(this.socialSettings()?.facebookAutoPost ?? false);
    this.postToInstagram.set(this.socialSettings()?.instagramAutoPost ?? false);
    this.customSocialMessage.set('');
    this.showSocialDetails.set(false);
    this.showForm.set(true);
  }

  edit(p: Product) {
    this.editing.set(p);
    // Sets discountMode/discountValue and hands back the "normal" price to show.
    const normalPrice = this.fromProduct(p);
    this.form = { name: p.name, description: p.description, brand: p.brand, category: typeof p.category === 'object' ? p.category._id : p.category, price: normalPrice, compareAtPrice: p.compareAtPrice, stock: p.stock, video: p.video || '', isFeatured: p.isFeatured, isFlashSale: !!p.isFlashSale, isActive: p.isActive };
    this.images = p.images?.length ? [...p.images] : [''];
    // Copied, not referenced — cancelling the modal must leave the product's
    // own colour list untouched.
    this.colors = (p.colors || []).map((c) => ({ ...c }));
    this.postToFacebook.set(false);
    this.postToInstagram.set(false);
    this.customSocialMessage.set('');
    this.showSocialDetails.set(false);
    this.error.set('');
    this.showForm.set(true);
  }

  close() { this.showForm.set(false); }

  save() {
    if (!this.form.name || !this.form.category || !this.form.price) { this.error.set('Name, category and price are required.'); return; }
    const problem = this.discountProblem();
    if (problem) { this.error.set(problem); return; }
    // A colour with no name can't be ordered (the server matches on name), so
    // drop half-filled rows rather than saving something unselectable.
    const colors = this.colors
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), hex: c.hex, image: (c.image || '').trim() }));
    this.saving.set(true);
    const payload = {
      ...this.form,
      ...this.toPayload(),
      // Clearing the discount clears the Flash Sale opt-in with it, so the flag
      // can't linger on a product that has nothing to advertise there.
      isFlashSale: this.discountMode === 'none' ? false : this.form.isFlashSale,
      images: this.images.map((u) => u.trim()).filter(Boolean),
      video: (this.form.video || '').trim(),
      colors,
      postToFacebook: this.postToFacebook(),
      postToInstagram: this.postToInstagram(),
      socialCustomMessage: (this.customSocialMessage() || '').trim(),
    };
    const req = this.editing() ? this.productSvc.update(this.editing()!._id, payload) : this.productSvc.create(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.reload(); },
      error: (err) => { this.error.set(err.error?.message || 'Could not save.'); this.saving.set(false); },
    });
  }

  remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    this.productSvc.remove(p._id).subscribe(() => this.reload());
  }

  catName(p: Product) { return typeof p.category === 'object' ? p.category.name : '—'; }

  /** Quick Social Share methods */
  openQuickShare(p: Product) {
    this.sharingProduct.set(p);
    this.quickShareFb = this.socialConfigured();
    this.quickShareIg = Boolean(this.socialSettings()?.instagramAccountId);
    this.quickShareMessage = '';
    this.sharingSuccessMessage.set('');
    this.sharingErrorMessage.set('');
    this.showQuickShareModal.set(true);
  }

  closeQuickShare() {
    this.showQuickShareModal.set(false);
    this.sharingProduct.set(null);
  }

  submitQuickShare() {
    const prod = this.sharingProduct();
    if (!prod) return;
    this.isSharingNow.set(true);
    this.sharingSuccessMessage.set('');
    this.sharingErrorMessage.set('');

    this.productSvc.shareSocial(prod._id, {
      postToFacebook: this.quickShareFb,
      postToInstagram: this.quickShareIg,
      customMessage: this.quickShareMessage.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.isSharingNow.set(false);
        this.sharingSuccessMessage.set(res.message || 'Successfully posted to social media!');
        setTimeout(() => {
          this.closeQuickShare();
        }, 1800);
      },
      error: (err) => {
        this.isSharingNow.set(false);
        this.sharingErrorMessage.set(err.error?.message || 'Failed to share to social media.');
      },
    });
  }
}

