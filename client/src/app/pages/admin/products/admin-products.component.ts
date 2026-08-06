import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, CategoryService } from '../../../core/services/api.service';
import { Category, Product } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, ImgFallbackDirective],
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
                      <div class="prod"><img [src]="p.images[0] || fallback" [alt]="p.name" appImgFallback /><span>{{ p.name }}</span></div>
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
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="modal-body">
            <div class="field"><label>Name</label><input class="input" [(ngModel)]="form.name" /></div>
            <div class="field"><label>Description</label><textarea class="input" [(ngModel)]="form.description"></textarea></div>
            <div class="grid grid-2">
              <div class="field"><label>Brand</label><input class="input" [(ngModel)]="form.brand" /></div>
              <div class="field"><label>Category</label>
                <select class="input" [(ngModel)]="form.category">
                  <option value="">Select…</option>
                  @for (c of categories(); track c._id) { <option [value]="c._id">{{ c.name }}</option> }
                </select>
              </div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Price (Rs)</label><input class="input" type="number" [(ngModel)]="form.price" /></div>
              <div class="field"><label>Compare-at price (Rs)</label><input class="input" type="number" [(ngModel)]="form.compareAtPrice" /></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Stock</label><input class="input" type="number" [(ngModel)]="form.stock" /></div>
              <div class="field"><label>School level</label>
                <select class="input" [(ngModel)]="form.ageGroup">
                  <option value="all">All levels</option><option value="pre-school">Pre-school (3–5 yrs)</option>
                  <option value="primary">Primary (5–10 yrs)</option><option value="middle">Middle school (11–13 yrs)</option>
                  <option value="high">High school (14+ yrs)</option>
                </select>
              </div>
            </div>
            <div class="field"><label>Image URL</label><input class="input" [(ngModel)]="imageUrl" placeholder="https://…" /></div>
            <div class="flex gap">
              <label class="check"><input type="checkbox" [(ngModel)]="form.isFeatured" /> Featured</label>
              <label class="check"><input type="checkbox" [(ngModel)]="form.isActive" /> Active (visible in shop)</label>
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
    .modal-head { display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid var(--line); }
    .modal-head h2 { margin:0; }
    .modal-body { padding:20px 24px; overflow-y:auto; }
    .modal-foot { display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid var(--line); }
    .check { display:flex; align-items:center; gap:8px; font-weight:700; }
    .check input { accent-color: var(--coral); width:18px; height:18px; }
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
  imageUrl = '';
  form: any = this.blank();

  constructor(private productSvc: ProductService, private catSvc: CategoryService) {}

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
    return { name: '', description: '', brand: 'Wondercart', category: '', price: 0, compareAtPrice: 0, stock: 0, ageGroup: 'all', isFeatured: false, isActive: true };
  }
  openNew() { this.editing.set(null); this.form = this.blank(); this.imageUrl = ''; this.error.set(''); this.showForm.set(true); }
  edit(p: Product) {
    this.editing.set(p);
    this.form = { name: p.name, description: p.description, brand: p.brand, category: typeof p.category === 'object' ? p.category._id : p.category, price: p.price, compareAtPrice: p.compareAtPrice, stock: p.stock, ageGroup: p.ageGroup, isFeatured: p.isFeatured, isActive: p.isActive };
    this.imageUrl = p.images?.[0] || '';
    this.error.set(''); this.showForm.set(true);
  }
  close() { this.showForm.set(false); }
  save() {
    if (!this.form.name || !this.form.category || !this.form.price) { this.error.set('Name, category and price are required.'); return; }
    this.saving.set(true);
    const payload = { ...this.form, images: this.imageUrl ? [this.imageUrl] : [] };
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
}
