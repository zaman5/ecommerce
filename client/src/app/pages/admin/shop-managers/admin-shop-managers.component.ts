import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShopManagerService, CategoryService, ProductService } from '../../../core/services/api.service';
import { Category, Product, ShopManager } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-admin-shop-managers',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />
        <div class="head">
          <div><h1>Shop Managers</h1><p class="text-muted">Create and manage shop managers with scoped access.</p></div>
          <button class="btn btn-primary" (click)="openNew()">+ Add shop manager</button>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          @if (managers().length === 0) {
            <div class="card card-pad center mt" style="padding:40px">
              <p style="font-size:1.2rem">👥</p>
              <p class="text-muted">No shop managers yet. Click <strong>+ Add shop manager</strong> to create one.</p>
            </div>
          } @else {
            <div class="card table-wrap mt">
              <table class="table">
                <thead><tr><th>Name</th><th>Email</th><th>Scope</th><th>Status</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  @for (m of managers(); track m.id) {
                    <tr>
                      <td><strong>{{ m.name }}</strong></td>
                      <td>{{ m.email }}</td>
                      <td>
                        <div class="scope-tags">
                          @for (c of m.assignedCategories; track c._id) {
                            <span class="tag tag-cat">🏷️ {{ c.name }}</span>
                          }
                          @for (p of m.assignedProducts; track p._id) {
                            <span class="tag tag-prod">📦 {{ p.name }}</span>
                          }
                        </div>
                      </td>
                      <td>
                        <span class="status" [class]="m.isActive ? 'status-delivered' : 'status-cancelled'">
                          {{ m.isActive ? 'Active' : 'Disabled' }}
                        </span>
                      </td>
                      <td class="text-muted">{{ m.createdAt | date:'MMM d, y' }}</td>
                      <td class="actions">
                        <button class="icon-btn" (click)="edit(m)" title="Edit">✏️</button>
                        <button class="icon-btn" (click)="toggleActive(m)" [title]="m.isActive ? 'Disable' : 'Enable'">
                          {{ m.isActive ? '🔒' : '🔓' }}
                        </button>
                        <button class="icon-btn" (click)="remove(m)" title="Delete">🗑️</button>
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
            <h2>{{ editing() ? 'Edit shop manager' : 'Add shop manager' }}</h2>
            <button class="icon-btn" (click)="close()">✕</button>
          </div>
          @if (error()) { <div class="alert alert-error" style="margin:16px 24px 0">{{ error() }}</div> }
          <div class="modal-body">
            <div class="grid grid-2">
              <div class="field"><label>Name</label><input class="input" [(ngModel)]="form.name" placeholder="Shop Manager Name" /></div>
              <div class="field"><label>Email</label><input class="input" type="email" [(ngModel)]="form.email" placeholder="manager@example.com" [disabled]="!!editing()" /></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Password {{ editing() ? '(leave blank to keep)' : '' }}</label><input class="input" type="password" [(ngModel)]="form.password" placeholder="••••••••" /></div>
              <div class="field"><label>Phone</label><input class="input" [(ngModel)]="form.phone" placeholder="Optional" /></div>
            </div>

            <div class="field">
              <label>Assign Categories <span class="hint">— manager can access all products in these categories</span></label>
              <div class="check-grid">
                @for (c of allCategories(); track c._id) {
                  <label class="check-item" [class.selected]="isCatSelected(c._id)">
                    <input type="checkbox" [checked]="isCatSelected(c._id)" (change)="toggleCat(c._id)" />
                    <span>🏷️ {{ c.name }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="field">
              <label>Assign Individual Products <span class="hint">— for products outside the selected categories</span></label>
              <div class="check-grid">
                @for (p of allProducts(); track p._id) {
                  <label class="check-item" [class.selected]="isProdSelected(p._id)">
                    <input type="checkbox" [checked]="isProdSelected(p._id)" (change)="toggleProd(p._id)" />
                    <span>📦 {{ p.name }}</span>
                  </label>
                }
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
    .scope-tags { display:flex; flex-wrap:wrap; gap:4px; }
    .tag { font-size:.75rem; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; }
    .tag-cat { background:#e3f0ff; color:#2b6cb0; }
    .tag-prod { background:#ede0ff; color:#6b46c1; }
    .actions { white-space:nowrap; }
    .icon-btn { background:none; border:none; font-size:1.1rem; cursor:pointer; padding:4px; border-radius:8px; }
    .icon-btn:hover { background: var(--cream); }
    .overlay { position:fixed; inset:0; background:rgba(51,65,79,.5); display:grid; place-items:center; z-index:100; padding:20px; }
    .modal { width:min(700px,100%); max-height:90vh; display:flex; flex-direction:column; }
    .modal-head { display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid var(--line); }
    .modal-head h2 { margin:0; }
    .modal-body { padding:20px 24px; overflow-y:auto; }
    .modal-foot { display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid var(--line); }
    .hint { font-weight:600; color: var(--muted); font-size:.82rem; }
    .check-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:6px; max-height:240px; overflow-y:auto; padding:8px; border:2px solid var(--line); border-radius:var(--radius-sm); background:#fff; }
    .check-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:.88rem; font-weight:600; transition:background .12s; }
    .check-item:hover { background:var(--cream); }
    .check-item.selected { background:var(--brand-soft); }
    .check-item input { accent-color:var(--brand); width:16px; height:16px; }
  `],
})
export class AdminShopManagersComponent implements OnInit {
  managers = signal<ShopManager[]>([]);
  allCategories = signal<Category[]>([]);
  allProducts = signal<Product[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editing = signal<ShopManager | null>(null);
  saving = signal(false);
  error = signal('');

  form = { name: '', email: '', password: '', phone: '' };
  selectedCats: string[] = [];
  selectedProds: string[] = [];

  constructor(
    private smSvc: ShopManagerService,
    private catSvc: CategoryService,
    private prodSvc: ProductService,
  ) {}

  ngOnInit() {
    this.reload();
    this.catSvc.list().subscribe((c) => this.allCategories.set(c));
    this.prodSvc.adminAll().subscribe((p) => this.allProducts.set(p));
  }

  reload() {
    this.loading.set(true);
    this.smSvc.list().subscribe({
      next: (m) => { this.managers.set(m); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isCatSelected(id: string) { return this.selectedCats.includes(id); }
  isProdSelected(id: string) { return this.selectedProds.includes(id); }
  toggleCat(id: string) {
    const i = this.selectedCats.indexOf(id);
    if (i >= 0) this.selectedCats.splice(i, 1); else this.selectedCats.push(id);
  }
  toggleProd(id: string) {
    const i = this.selectedProds.indexOf(id);
    if (i >= 0) this.selectedProds.splice(i, 1); else this.selectedProds.push(id);
  }

  openNew() {
    this.editing.set(null);
    this.form = { name: '', email: '', password: '', phone: '' };
    this.selectedCats = [];
    this.selectedProds = [];
    this.error.set('');
    this.showForm.set(true);
  }

  edit(m: ShopManager) {
    this.editing.set(m);
    this.form = { name: m.name, email: m.email, password: '', phone: m.phone || '' };
    this.selectedCats = m.assignedCategories.map((c) => c._id);
    this.selectedProds = m.assignedProducts.map((p) => p._id);
    this.error.set('');
    this.showForm.set(true);
  }

  close() { this.showForm.set(false); }

  save() {
    if (!this.form.name || !this.form.email) { this.error.set('Name and email are required.'); return; }
    if (!this.editing() && !this.form.password) { this.error.set('Password is required for new managers.'); return; }
    if (!this.selectedCats.length && !this.selectedProds.length) { this.error.set('Assign at least one category or product.'); return; }

    this.saving.set(true);
    if (this.editing()) {
      const data: any = {
        name: this.form.name,
        phone: this.form.phone,
        assignedCategories: this.selectedCats,
        assignedProducts: this.selectedProds,
      };
      if (this.form.password) data.password = this.form.password;
      this.smSvc.update(this.editing()!.id, data).subscribe({
        next: () => { this.saving.set(false); this.showForm.set(false); this.reload(); },
        error: (err) => { this.error.set(err.error?.message || 'Could not save.'); this.saving.set(false); },
      });
    } else {
      this.smSvc.create({
        name: this.form.name,
        email: this.form.email,
        password: this.form.password,
        phone: this.form.phone,
        assignedCategories: this.selectedCats,
        assignedProducts: this.selectedProds,
      }).subscribe({
        next: () => { this.saving.set(false); this.showForm.set(false); this.reload(); },
        error: (err) => { this.error.set(err.error?.message || 'Could not create.'); this.saving.set(false); },
      });
    }
  }

  toggleActive(m: ShopManager) {
    this.smSvc.update(m.id, { isActive: !m.isActive }).subscribe(() => this.reload());
  }

  remove(m: ShopManager) {
    if (!confirm(`Delete shop manager "${m.name}"? This cannot be undone.`)) return;
    this.smSvc.remove(m.id).subscribe(() => this.reload());
  }
}
