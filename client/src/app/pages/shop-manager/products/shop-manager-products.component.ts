import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService, CategoryService, UploadService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Category, Product, ProductColor } from '../../../core/models/models';
import { ShopManagerNavComponent } from '../shop-manager-nav.component';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { SwatchPipe } from '../../../shared/pipes/swatch.pipe';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor.component';

@Component({
  selector: 'app-sm-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShopManagerNavComponent, ImgFallbackDirective, MediaUrlPipe, SwatchPipe, RichTextEditorComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-shop-manager-nav />
        <div class="head">
          <div><h1>My Products</h1><p class="text-muted">Manage products assigned to you.</p></div>
          <button class="btn btn-primary" (click)="openNew()">+ Add product</button>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          @if (products().length === 0) {
            <div class="card card-pad center mt" style="padding:40px">
              <p class="text-muted">No products assigned to you yet. Contact your admin.</p>
            </div>
          } @else {
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
                        <button class="icon-btn" (click)="edit(p)" title="Edit">✏️</button>
                        <button class="icon-btn" (click)="remove(p)" title="Delete">🗑️</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </section>

    <!-- Modal -->
    @if (showForm()) {
      <div class="overlay" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>{{ editing() ? 'Edit product' : 'Add product' }}</h2>
            <button class="icon-btn" (click)="close()">✕</button>
          </div>
          @if (error()) { <div class="alert alert-error" style="margin:16px 24px 0">{{ error() }}</div> }
          <div class="modal-body">
            <div class="field"><label>Name</label><input class="input" [(ngModel)]="form.name" /></div>
            <div class="field">
              <label>Description</label>
              <app-rich-text [(ngModel)]="form.description" [ngModelOptions]="{standalone:true}"
                             placeholder="Describe the product…" />
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
            <div class="grid grid-2">
              <div class="field">
                <label>Price (Rs)</label>
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
            <div class="price-summary">
              @if (discountMode === 'none') {
                Customers pay <strong>Rs {{ form.price | number }}</strong>.
              } @else {
                Customers pay <strong>Rs {{ sellingPrice() | number }}</strong>
                · was <s>Rs {{ form.price | number }}</s>
                · <b>{{ discountPercent() }}% off</b>
              }
            </div>
            <div class="field"><label>Stock</label><input class="input" type="number" [(ngModel)]="form.stock" /></div>
            <div class="field">
              <label>Photos</label>
              @for (url of images; track $index) {
                <div class="img-row">
                  <span class="img-preview">
                    @if (images[$index]) {
                      <img [src]="images[$index] | mediaUrl" alt="" appImgFallback />
                    } @else { <span class="img-no">{{ $index + 1 }}</span> }
                  </span>
                  <input class="input" [ngModel]="images[$index]" (ngModelChange)="images[$index] = $event"
                         [ngModelOptions]="{standalone:true}" placeholder="Paste an image link…" />
                  <label class="upload-btn" [class.busy]="uploadingAt() === $index">
                    {{ uploadingAt() === $index ? '…' : '📁' }}
                    <input type="file" accept="image/*" hidden
                           (change)="uploadInto($index, $event)" [disabled]="uploadingAt() !== null" />
                  </label>
                  <button class="icon-btn" (click)="removeImage($index)">🗑️</button>
                </div>
              }
              <button class="btn btn-ghost btn-sm" (click)="addImage()">+ Add photo</button>
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
              <p class="hint mt-sm">Upload a video file (max 50MB) or paste a direct video link.</p>
            </div>

            <div class="field">
              <label>Colours</label>
              @for (c of colors; track $index) {
                <div class="colour-row">
                  <input class="input" [(ngModel)]="c.name" [ngModelOptions]="{standalone:true}" placeholder="Colour name" />
                  <input class="input" [(ngModel)]="c.image" [ngModelOptions]="{standalone:true}" placeholder="Photo link" />
                  <label class="upload-btn" [class.busy]="uploadingColorAt() === $index">
                    {{ uploadingColorAt() === $index ? '…' : '📁' }}
                    <input type="file" accept="image/*" hidden
                           (change)="uploadColorInto($index, $event)" [disabled]="uploadingColorAt() !== null" />
                  </label>
                  <input class="swatch-input" type="color" [(ngModel)]="c.hex" [ngModelOptions]="{standalone:true}" />
                  <button class="icon-btn" (click)="removeColor($index)">🗑️</button>
                </div>
              }
              <button class="btn btn-ghost btn-sm" (click)="addColor()">+ Add colour</button>
            </div>
            <div class="flex gap">
              <label class="check"><input type="checkbox" [(ngModel)]="form.isFeatured" /> Featured</label>
              <label class="check"><input type="checkbox" [(ngModel)]="form.isActive" /> Active</label>
            </div>

            <!-- SEO & Multi-Keywords Suite (eBay & Daraz style) -->
            <div class="seo-panel mt">
              <div class="seo-panel-head">
                <span class="seo-panel-icon">🚀</span>
                <div>
                  <strong>Search Engine Optimization (SEO) &amp; Multi-Keywords</strong>
                  <span class="seo-panel-desc">Optimize for Google, Daraz &amp; marketplace search ranking</span>
                </div>
                <button type="button" class="btn btn-ghost btn-xs auto-seo-btn" (click)="autoGenerateSeo()">
                  ✨ Auto-generate SEO
                </button>
              </div>

              <!-- Multi-Keyword / Tag Input Option (eBay & Daraz style) -->
              <div class="field mt-sm">
                <label>
                  Multi-Keyword Addition (eBay &amp; Daraz style)
                  <span class="hint">— Type keyword and press Enter or comma (e.g. baby shoes, toddler sneakers)</span>
                </label>
                <div class="kw-input-wrap">
                  <input
                    class="input kw-field"
                    [(ngModel)]="keywordInput"
                    [ngModelOptions]="{standalone:true}"
                    (keydown)="onKeywordKeydown($event)"
                    placeholder="Type keyword and press Enter..."
                  />
                  <button type="button" class="btn btn-primary btn-sm" (click)="addKeyword()">+ Add</button>
                </div>

                @if (keywords.length) {
                  <div class="kw-tags-wrap mt-xs">
                    @for (kw of keywords; track $index) {
                      <span class="kw-tag">
                        <span class="kw-text">{{ kw }}</span>
                        <button type="button" class="kw-remove" (click)="removeKeyword($index)" aria-label="Remove keyword">✕</button>
                      </span>
                    }
                    <button type="button" class="kw-clear-all" (click)="keywords = []">Clear all ({{ keywords.length }})</button>
                  </div>
                } @else {
                  <p class="hint kw-empty-tip mt-xs">💡 Add 5-10 keywords to maximize discovery in search results!</p>
                }
              </div>

              <!-- Meta Title -->
              <div class="field mt-sm">
                <div class="field-head-flex">
                  <label>SEO Meta Title <span class="hint">(shown on Google &amp; browser tab)</span></label>
                  <span class="char-count" [class.warn]="(form.metaTitle?.length || 0) > 60">
                    {{ form.metaTitle?.length || 0 }}/60 chars
                  </span>
                </div>
                <input class="input" [(ngModel)]="form.metaTitle" placeholder="Custom SEO Title (defaults to product name if blank)..." />
              </div>

              <!-- Meta Description -->
              <div class="field mt-sm">
                <div class="field-head-flex">
                  <label>SEO Meta Description <span class="hint">(snippet shown on Google search)</span></label>
                  <span class="char-count" [class.warn]="(form.metaDescription?.length || 0) > 160">
                    {{ form.metaDescription?.length || 0 }}/160 chars
                  </span>
                </div>
                <textarea class="input" rows="2" [(ngModel)]="form.metaDescription" placeholder="Custom search snippet description..."></textarea>
              </div>

              <!-- Live Google Search Snippet Preview -->
              <div class="google-preview-card mt-sm">
                <div class="google-preview-label">🔍 Live Google Search Preview</div>
                <div class="google-preview-box">
                  <div class="gp-cite">
                    <span class="gp-fav">🛒</span>
                    <span class="gp-url">wondercart.pk › product › {{ previewSlug() }}</span>
                  </div>
                  <div class="gp-title">{{ previewTitle() }}</div>
                  <div class="gp-desc">{{ previewDesc() }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="close()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save' }}</button>
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
    .modal-head { display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid var(--line); }
    .modal-head h2 { margin:0; }
    .modal-body { padding:20px 24px; overflow-y:auto; }
    .modal-foot { display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid var(--line); }
    .disc-row { display:flex; gap:8px; }
    .disc-row select { flex:1; min-width:0; }
    .disc-row .disc-val { flex:0 0 110px; }
    .price-summary { margin:-4px 0 16px; padding:10px 14px; border-radius: var(--radius-sm); background: var(--soft); color:var(--ink); font-size:.88rem; font-weight:600; }
    .price-summary s { color:#6b8f89; }
    .price-summary b { color:#1f6b60; }
    .img-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .img-row .input { flex:1; min-width:0; }
    .img-preview { width:40px; height:40px; flex:none; border-radius:8px; overflow:hidden; background: var(--cream-deep); display:grid; place-items:center; border:1px solid var(--line); }
    .img-preview img { width:100%; height:100%; object-fit:cover; }
    .img-no { font-weight:800; color: var(--muted); font-size:.85rem; }
    .upload-btn { flex:none; width:40px; height:40px; display:grid; place-items:center; cursor:pointer; border:1px solid var(--line); border-radius:8px; background:#fff; font-size:1.05rem; }
    .upload-btn:hover { border-color: var(--brand); }
    .upload-btn.busy { opacity:.6; cursor:progress; }
    .colour-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .colour-row .input { flex:1; min-width:0; }
    .swatch-input { width:48px; height:44px; padding:2px; border:2px solid var(--line); border-radius: var(--radius-sm); background:#fff; cursor:pointer; flex:none; }
    .vid-icon { font-size:1.15rem; display:grid; place-items:center; background: var(--cream-deep); }
    .video-preview-wrap { max-width:320px; border-radius: var(--radius-sm); overflow:hidden; border:2px solid var(--line); background:#000; }
    .video-preview-player { width:100%; height:auto; max-height:180px; display:block; }
    .check { display:flex; align-items:center; gap:8px; font-weight:700; }
    .check input { accent-color: var(--ink); width:18px; height:18px; }
    
    /* SEO & Keywords Section */
    .seo-panel { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; }
    .seo-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .seo-panel-head > div { flex: 1; min-width: 180px; }
    .seo-panel-icon { font-size: 1.3rem; }
    .seo-panel-head strong { font-size: .95rem; display: block; color: var(--ink); }
    .seo-panel-desc { font-size: .78rem; color: var(--muted); }
    .auto-seo-btn { color: var(--brand); font-weight: 700; border: 1.5px solid var(--brand); border-radius: 6px; padding: 3px 8px; font-size: .78rem; }
    .auto-seo-btn:hover { background: #fff6f4; }

    .kw-input-wrap { display: flex; gap: 8px; align-items: center; }
    .kw-field { flex: 1; min-width: 0; }
    .kw-tags-wrap { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
    .kw-tag {
      display: inline-flex; align-items: center; gap: 6px; background: #e0f2fe; color: #0369a1;
      font-size: .8rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;
      border: 1px solid #bae6fd;
    }
    .kw-text { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .kw-remove { background: none; border: none; font-size: .85rem; color: #0284c7; cursor: pointer; padding: 0 2px; line-height: 1; }
    .kw-remove:hover { color: #b91c1c; }
    .kw-clear-all { background: none; border: none; font-size: .75rem; color: var(--danger); font-weight: 700; cursor: pointer; padding: 2px 6px; }
    .kw-clear-all:hover { text-decoration: underline; }
    .kw-empty-tip { color: #64748b; font-size: .8rem; margin-top: 6px; }

    .field-head-flex { display: flex; justify-content: space-between; align-items: center; }
    .char-count { font-size: .75rem; color: var(--muted); font-weight: 700; font-family: monospace; }
    .char-count.warn { color: var(--danger); }

    /* Live Google Preview */
    .google-preview-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; box-shadow: var(--shadow-sm); }
    .google-preview-label { font-size: .75rem; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: .5px; }
    .google-preview-box { font-family: Roboto, Arial, sans-serif; }
    .gp-cite { display: flex; align-items: center; gap: 6px; font-size: .8rem; color: #202124; margin-bottom: 2px; }
    .gp-fav { font-size: .85rem; }
    .gp-url { color: #4d5156; font-size: .76rem; }
    .gp-title { color: #1a0dab; font-size: 1.05rem; font-weight: 400; line-height: 1.3; cursor: pointer; margin-bottom: 3px; word-break: break-word; }
    .gp-title:hover { text-decoration: underline; }
    .gp-desc { color: #4d5156; font-size: .84rem; line-height: 1.4; word-break: break-word; }

    @media (max-width:760px) {
      .colour-row { flex-wrap:wrap; }
      .colour-row .input { flex:1 1 100%; }
      .img-row { flex-wrap:wrap; }
      .img-row .input { flex:1 1 100%; }
    }
  `],
})
export class ShopManagerProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editing = signal<Product | null>(null);
  saving = signal(false);
  error = signal('');
  fallback = FALLBACK_IMAGE;
  images: string[] = [];
  form: any = this.blank();
  colors: ProductColor[] = [];
  keywords: string[] = [];
  keywordInput = '';
  uploadingAt = signal<number | null>(null);
  uploadingColorAt = signal<number | null>(null);
  uploadingVideo = signal(false);
  discountMode: 'none' | 'amount' | 'percent' = 'none';
  discountValue = 0;

  constructor(
    private productSvc: ProductService,
    private catSvc: CategoryService,
    private uploads: UploadService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.catSvc.list().subscribe((c) => this.categories.set(c));
    this.reload();
  }
  reload() {
    this.loading.set(true);
    this.productSvc.adminAll().subscribe({
      next: (p) => { this.products.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  blank() {
    return {
      name: '',
      description: '',
      brand: 'Wondercart',
      category: '',
      price: 0,
      compareAtPrice: 0,
      stock: 0,
      video: '',
      isFeatured: false,
      isFlashSale: false,
      isActive: true,
      metaTitle: '',
      metaDescription: '',
    };
  }

  addKeyword() {
    const raw = this.keywordInput.trim();
    if (!raw) return;
    const splitted = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const k of splitted) {
      if (!this.keywords.some((existing) => existing.toLowerCase() === k.toLowerCase())) {
        this.keywords.push(k);
      }
    }
    this.keywordInput = '';
  }

  onKeywordKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      this.addKeyword();
    }
  }

  removeKeyword(i: number) {
    this.keywords.splice(i, 1);
  }

  autoGenerateSeo() {
    const name = (this.form.name || '').trim();
    const brand = (this.form.brand || '').trim() || 'Wondercart';
    const catObj = this.categories().find((c) => c._id === this.form.category);
    const catName = catObj ? catObj.name : '';

    if (!this.form.metaTitle && name) {
      this.form.metaTitle = `${name} — Buy Online in Pakistan | ${brand}`;
    }
    if (!this.form.metaDescription && name) {
      this.form.metaDescription = `Buy ${name} (${brand}) online at best price in Pakistan. High quality ${catName ? catName.toLowerCase() : 'kids essentials'} with fast cash on delivery.`;
    }

    const suggestions: string[] = [];
    if (name) {
      suggestions.push(name);
      suggestions.push(`buy ${name}`);
      suggestions.push(`${name} online`);
      suggestions.push(`${name} price in Pakistan`);
    }
    if (brand && brand !== 'Wondercart') {
      suggestions.push(brand);
      if (name) suggestions.push(`${brand} ${name}`);
    }
    if (catName) {
      suggestions.push(catName);
      suggestions.push(`${catName} Pakistan`);
    }
    suggestions.push('cash on delivery', 'fast shipping Pakistan');

    for (const s of suggestions) {
      if (!this.keywords.some((k) => k.toLowerCase() === s.toLowerCase())) {
        this.keywords.push(s);
      }
    }
  }

  previewSlug(): string {
    return (this.form.name || 'product-slug')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  previewTitle(): string {
    return this.form.metaTitle?.trim() || (this.form.name ? `${this.form.name} — Buy Online in Pakistan | ${this.form.brand || 'Wondercart'}` : 'Product Title — Buy Online in Pakistan');
  }

  previewDesc(): string {
    if (this.form.metaDescription?.trim()) return this.form.metaDescription.trim();
    const clean = (this.form.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    if (clean) return clean.slice(0, 150) + '...';
    return `Buy ${this.form.name || 'this product'} online at best price in Pakistan. Genuine quality, fast nationwide delivery and cash on delivery.`;
  }

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
  discountPercent(): number {
    const base = Number(this.form.price) || 0;
    if (base <= 0) return 0;
    return Math.round((1 - this.sellingPrice() / base) * 100);
  }
  private toPayload() {
    const normal = Number(this.form.price) || 0;
    if (this.discountMode === 'none') return { price: normal, compareAtPrice: 0 };
    return { price: this.sellingPrice(), compareAtPrice: normal };
  }
  private fromProduct(p: Product) {
    if (p.compareAtPrice > p.price) {
      this.discountMode = 'amount';
      this.discountValue = p.compareAtPrice - p.price;
      return p.compareAtPrice;
    }
    this.discountMode = 'none';
    this.discountValue = 0;
    return p.price;
  }

  departments(): Category[] {
    const user = this.auth.user();
    if (!user || user.role === 'admin') return this.categories().filter((c) => !c.parent);
    const assigned = (user.assignedCategories || []).map((id: any) => (id._id || id).toString());
    if (!assigned.length) return [];

    const assignedCats = this.categories().filter((c) => assigned.includes(c._id.toString()));
    const subAssignedParentSlugs = assignedCats.filter((c) => c.parent).map((c) => c.parent);

    return this.categories().filter((c) => !c.parent && (assigned.includes(c._id.toString()) || subAssignedParentSlugs.includes(c.slug)));
  }

  subsOf(parentSlug: string): Category[] {
    const user = this.auth.user();
    if (!user || user.role === 'admin') return this.categories().filter((c) => c.parent === parentSlug);
    const assigned = (user.assignedCategories || []).map((id: any) => (id._id || id).toString());
    if (!assigned.length) return [];

    const parent = this.categories().find((c) => c.slug === parentSlug);
    const parentAssigned = parent && assigned.includes(parent._id.toString());

    return this.categories().filter((c) => c.parent === parentSlug && (parentAssigned || assigned.includes(c._id.toString())));
  }

  addColor() { this.colors.push({ name: '', hex: '#cccccc', image: '' }); }
  removeColor(i: number) { this.colors.splice(i, 1); }
  addImage() { this.images.push(''); }
  removeImage(i: number) { this.images.splice(i, 1); if (!this.images.length) this.images.push(''); }

  uploadColorInto(i: number, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingColorAt.set(i);
    this.uploads.image(file).subscribe({
      next: (r) => { this.colors[i].image = r.url; this.uploadingColorAt.set(null); input.value = ''; },
      error: (err) => { this.error.set(err.error?.message || 'Upload failed.'); this.uploadingColorAt.set(null); input.value = ''; },
    });
  }
  uploadInto(i: number, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingAt.set(i);
    this.uploads.image(file).subscribe({
      next: (r) => { this.images[i] = r.url; this.uploadingAt.set(null); input.value = ''; },
      error: (err) => { this.error.set(err.error?.message || 'Upload failed.'); this.uploadingAt.set(null); input.value = ''; },
    });
  }
  uploadVideo(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingVideo.set(true);
    this.error.set('');
    this.uploads.video(file).subscribe({
      next: (r) => { this.form.video = r.url; this.uploadingVideo.set(false); input.value = ''; },
      error: (err) => { this.error.set(err.error?.message || 'Video upload failed.'); this.uploadingVideo.set(false); input.value = ''; },
    });
  }

  openNew() {
    this.editing.set(null);
    this.form = this.blank();
    this.keywords = [];
    this.keywordInput = '';
    this.discountMode = 'none';
    this.discountValue = 0;
    this.images = [''];
    this.colors = [];
    this.error.set('');
    this.showForm.set(true);
  }

  edit(p: Product) {
    this.editing.set(p);
    const normalPrice = this.fromProduct(p);
    this.form = {
      name: p.name,
      description: p.description,
      brand: p.brand,
      category: typeof p.category === 'object' ? p.category._id : p.category,
      price: normalPrice,
      compareAtPrice: p.compareAtPrice,
      stock: p.stock,
      video: p.video || '',
      isFeatured: p.isFeatured,
      isFlashSale: !!p.isFlashSale,
      isActive: p.isActive,
      metaTitle: p.metaTitle || '',
      metaDescription: p.metaDescription || '',
    };
    this.keywords = Array.isArray(p.keywords)
      ? [...p.keywords]
      : typeof p.keywords === 'string'
      ? (p.keywords as string).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    this.keywordInput = '';
    this.images = p.images?.length ? [...p.images] : [''];
    this.colors = (p.colors || []).map((c) => ({ ...c }));
    this.error.set('');
    this.showForm.set(true);
  }

  close() { this.showForm.set(false); }

  save() {
    if (!this.form.name || !this.form.category || !this.form.price) { this.error.set('Name, category and price are required.'); return; }
    const colors = this.colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex, image: (c.image || '').trim() }));
    this.saving.set(true);
    const payload = {
      ...this.form,
      ...this.toPayload(),
      isFlashSale: this.discountMode === 'none' ? false : this.form.isFlashSale,
      images: this.images.map((u) => u.trim()).filter(Boolean),
      video: (this.form.video || '').trim(),
      metaTitle: (this.form.metaTitle || '').trim(),
      metaDescription: (this.form.metaDescription || '').trim(),
      keywords: this.keywords,
      tags: this.keywords,
      colors,
    };
    const req = this.editing() ? this.productSvc.update(this.editing()!._id, payload) : this.productSvc.create(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.reload(); },
      error: (err) => { this.error.set(err.error?.message || 'Could not save.'); this.saving.set(false); },
    });
  }
  remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.productSvc.remove(p._id).subscribe(() => this.reload());
  }
  catName(p: Product) { return typeof p.category === 'object' ? p.category.name : '—'; }
}
