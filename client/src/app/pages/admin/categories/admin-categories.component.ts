import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../core/services/api.service';
import { Category } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />

        <div class="head">
          <div>
            <h1>Categories</h1>
            <p class="text-muted">
              {{ departments().length }} departments · {{ subCount() }} sub-categories.
              Sub-categories are what shoppers drill into from a department.
            </p>
          </div>
          <button class="btn btn-primary" (click)="openNew()">+ New category</button>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          <div class="tree card">
            @for (d of departments(); track d._id) {
              <div class="dept-block">
                <div class="row dept">
                  <div class="row-main">
                    <strong>{{ d.name }}</strong>
                    <code>{{ d.slug }}</code>
                  </div>
                  <span class="count">{{ d.productCount }} product{{ d.productCount === 1 ? '' : 's' }}</span>
                  <div class="actions">
                    <button class="icon-btn" (click)="openNew(d.slug)" title="Add a sub-category">➕</button>
                    <button class="icon-btn" (click)="edit(d)" title="Edit">✏️</button>
                    <button class="icon-btn" (click)="remove(d)" title="Delete">🗑️</button>
                  </div>
                </div>
                @for (s of subsOf(d.slug); track s._id) {
                  <div class="row sub">
                    <div class="row-main">
                      <span>{{ s.name }}</span>
                      <code>{{ s.slug }}</code>
                    </div>
                    <span class="count">{{ s.productCount }} product{{ s.productCount === 1 ? '' : 's' }}</span>
                    <div class="actions">
                      <button class="icon-btn" (click)="edit(s)" title="Edit">✏️</button>
                      <button class="icon-btn" (click)="remove(s)" title="Delete">🗑️</button>
                    </div>
                  </div>
                }
                @if (!subsOf(d.slug).length) {
                  <div class="row empty-sub">No sub-categories yet.</div>
                }
              </div>
            }
          </div>

          @if (orphans().length) {
            <div class="alert alert-error mt">
              {{ orphans().length }} category/ies point at a parent that no longer exists.
            </div>
          }
        }
      </div>
    </section>

    @if (showForm()) {
      <div class="overlay" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editing() ? 'Edit category' : 'New category' }}</h3>
            <button class="icon-btn" (click)="close()">✕</button>
          </div>
          <div class="modal-body">
            @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

            <div class="field">
              <label>Name</label>
              <input class="input" [(ngModel)]="form.name" placeholder="e.g. Chargers &amp; Cables" />
            </div>

            <div class="field">
              <label>Parent department <span class="hint">— leave as “None” to create a top-level department</span></label>
              <select class="input" [(ngModel)]="form.parent">
                <option [ngValue]="''">None (top-level department)</option>
                @for (d of parentOptions(); track d._id) {
                  <option [ngValue]="d._id">{{ d.name }}</option>
                }
              </select>
              @if (editing() && subsOf(editing()!.slug).length) {
                <p class="hint mt-sm">
                  This department has {{ subsOf(editing()!.slug).length }} sub-categories, so it cannot become a sub-category itself.
                </p>
              }
            </div>

            <div class="field">
              <label>Slug <span class="hint">— leave blank to generate from the name</span></label>
              <input class="input" [(ngModel)]="form.slug" placeholder="auto" />
            </div>

            <div class="field">
              <label>Description</label>
              <textarea class="input" rows="2" [(ngModel)]="form.description"></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="close()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Save category' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
    .head h1 { margin:0 0 4px; }
    .tree { padding:6px 0; }
    .dept-block { border-bottom:1px solid var(--line); }
    .dept-block:last-child { border-bottom:none; }
    .row { display:flex; align-items:center; gap:12px; padding:10px 18px; }
    .row.dept { background: var(--cream); }
    .row.sub { padding-left:44px; border-top:1px solid var(--line); }
    .row.empty-sub { padding-left:44px; border-top:1px solid var(--line); color: var(--muted); font-size:.85rem; font-style:italic; }
    .row-main { flex:1; min-width:0; display:flex; flex-direction:column; }
    .row-main code { font-size:.74rem; color: var(--muted); }
    .count { font-size:.82rem; color: var(--muted); white-space:nowrap; }
    .actions { display:flex; gap:2px; }
    .icon-btn { background:none; border:none; font-size:1rem; cursor:pointer; padding:5px; border-radius:8px; }
    .icon-btn:hover { background:#fff; }
    .hint { font-weight:600; color: var(--muted); font-size:.82rem; }
    .mt-sm { margin-top:6px; }
    .overlay { position:fixed; inset:0; background:rgba(51,65,79,.5); display:grid; place-items:center; z-index:100; padding:20px; }
    .modal { width:min(560px,100%); max-height:90vh; display:flex; flex-direction:column; }
    .modal-head, .modal-foot { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; flex-shrink:0; }
    .modal-head { border-bottom:1px solid var(--line); }
    .modal-body { padding:18px 20px; overflow-y:auto; flex:1; min-height:0; }
    .modal-foot { border-top:1px solid var(--line); gap:10px; justify-content:flex-end; }
    .modal-head h3 { margin:0; font-size:1.1rem; }
    @media (max-width: 560px) {
      .row { padding: 10px 12px; gap: 8px; flex-wrap: wrap; }
      .row.sub, .row.empty-sub { padding-left: 20px; }
      .actions { margin-left: auto; }
    }
  `],
})
export class AdminCategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editing = signal<Category | null>(null);
  error = signal('');
  form: { name: string; slug: string; description: string; parent: string } = this.blank();

  constructor(private catSvc: CategoryService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.catSvc.list().subscribe({
      next: (c) => { this.categories.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  departments() { return this.categories().filter((c) => !c.parent); }
  subsOf(parentSlug: string) { return this.categories().filter((c) => c.parent === parentSlug); }
  subCount() { return this.categories().filter((c) => c.parent).length; }

  /** A category whose parent slug matches nothing — shouldn't happen, but say so if it does. */
  orphans() {
    const slugs = new Set(this.categories().map((c) => c.slug));
    return this.categories().filter((c) => c.parent && !slugs.has(c.parent));
  }

  /** Only top-level categories can be parents, and nothing can parent itself. */
  parentOptions() {
    const self = this.editing();
    return this.departments().filter((d) => !self || d._id !== self._id);
  }

  blank() { return { name: '', slug: '', description: '', parent: '' }; }

  openNew(parentSlug?: string) {
    this.editing.set(null);
    this.form = this.blank();
    if (parentSlug) {
      const p = this.categories().find((c) => c.slug === parentSlug);
      if (p) this.form.parent = p._id;
    }
    this.error.set('');
    this.showForm.set(true);
  }

  edit(c: Category) {
    this.editing.set(c);
    const parent = c.parent ? this.categories().find((x) => x.slug === c.parent) : null;
    this.form = {
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      parent: parent?._id ?? '',
    };
    this.error.set('');
    this.showForm.set(true);
  }

  close() { this.showForm.set(false); }

  save() {
    if (!this.form.name.trim()) { this.error.set('Please give the category a name.'); return; }
    this.saving.set(true);
    // '' means top-level; the API expects null rather than an empty string.
    const payload = { ...this.form, parent: this.form.parent || null };
    const req = this.editing()
      ? this.catSvc.update(this.editing()!._id, payload)
      : this.catSvc.create(payload);

    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.reload(); },
      error: (err) => { this.error.set(err.error?.message || 'Could not save.'); this.saving.set(false); },
    });
  }

  remove(c: Category) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    this.catSvc.remove(c._id).subscribe({
      next: () => this.reload(),
      // The API refuses when products or sub-categories still use it — surface that.
      error: (err) => alert(err.error?.message || 'Could not delete that category.'),
    });
  }
}
