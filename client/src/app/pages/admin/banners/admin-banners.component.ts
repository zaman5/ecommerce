import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BannerService, UploadService } from '../../../core/services/api.service';
import { Banner } from '../../../core/models/models';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-admin-banners',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, MediaUrlPipe],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />

        <div class="head">
          <div>
            <h1>Banners</h1>
            <p class="text-muted">
              The slideshow at the top of the home page.
              {{ activeCount() }} of {{ banners().length }} showing · they rotate every 5 seconds in the order below.
            </p>
          </div>
          <button class="btn btn-primary" (click)="openNew()">+ New banner</button>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else if (!banners().length) {
          <div class="card card-pad center">
            <p class="text-muted">No banners yet — the home page shows the Flash Sale straight away.</p>
            <button class="btn btn-primary mt" (click)="openNew()">Add your first banner</button>
          </div>
        } @else {
          <div class="list card">
            @for (b of banners(); track b._id; let i = $index) {
              <div class="row" [class.off]="!b.isActive">
                <img class="thumb" [src]="b.image | mediaUrl" [alt]="b.title" />
                <div class="row-main">
                  <strong>{{ b.title }}</strong>
                  @if (b.subtitle) { <span class="sub">{{ b.subtitle }}</span> }
                  <code>{{ b.ctaLabel || 'Shop now' }} → {{ b.link || '/shop' }}</code>
                </div>

                <button class="pill" [class.on]="b.isActive" (click)="toggle(b)"
                  [title]="b.isActive ? 'Showing on the home page — click to hide' : 'Hidden — click to show'">
                  {{ b.isActive ? '✓ on' : '✗ off' }}
                </button>

                <div class="order">
                  <button class="icon-btn" [disabled]="i === 0" (click)="move(i, -1)" title="Move up">↑</button>
                  <button class="icon-btn" [disabled]="i === banners().length - 1" (click)="move(i, 1)" title="Move down">↓</button>
                </div>

                <div class="actions">
                  <button class="icon-btn" (click)="edit(b)" title="Edit">✏️</button>
                  <button class="icon-btn" (click)="remove(b)" title="Delete">🗑️</button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>

    @if (showForm()) {
      <div class="overlay" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editing() ? 'Edit banner' : 'New banner' }}</h3>
            <button class="icon-btn" (click)="close()">✕</button>
          </div>
          <div class="modal-body">
            @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

            <div class="field">
              <label>Title</label>
              <input class="input" [(ngModel)]="form.title" placeholder="e.g. Back to school, sorted" />
            </div>

            <div class="field">
              <label>Subtitle <span class="hint">— optional</span></label>
              <textarea class="input" rows="2" [(ngModel)]="form.subtitle"
                placeholder="Bags, lunch boxes and stationery — up to 40% off."></textarea>
            </div>

            <div class="field">
              <label>Background image</label>
              <div class="img-row">
                <input class="input" [(ngModel)]="form.image" placeholder="https://… or upload →" />
                <label class="upload-btn" [class.busy]="uploading()">
                  {{ uploading() ? '…' : '📁' }}
                  <input type="file" accept="image/*" hidden (change)="uploadImage($event)" [disabled]="uploading()" />
                </label>
              </div>
              <p class="hint mt-sm">Paste a link, or use 📁 to upload (max 5MB). Wide photos work best — around 1600×600.</p>
              @if (form.image) {
                <div class="preview" [class.light]="form.theme === 'light'">
                  <img [src]="form.image | mediaUrl" alt="Banner preview" />
                  <div class="preview-copy">
                    <strong>{{ form.title || 'Your title' }}</strong>
                    @if (form.subtitle) { <span>{{ form.subtitle }}</span> }
                    <em>{{ form.ctaLabel || 'Shop now' }}</em>
                  </div>
                </div>
              }
            </div>

            <div class="two">
              <div class="field">
                <label>Button text</label>
                <input class="input" [(ngModel)]="form.ctaLabel" placeholder="Shop now" />
              </div>
              <div class="field">
                <label>Button links to</label>
                <input class="input" [(ngModel)]="form.link" placeholder="/shop?deals=true" />
              </div>
            </div>
            <p class="hint">
              A path on this site (<code>/shop</code>, <code>/shop?deals=true</code>,
              <code>/product/some-slug</code>) or a full https:// address, which opens in a new tab.
            </p>

            <div class="two mt">
              <div class="field">
                <label>Text colour</label>
                <select class="input" [(ngModel)]="form.theme">
                  <option value="dark">Light text (for a dark photo)</option>
                  <option value="light">Dark text (for a light photo)</option>
                </select>
              </div>
              <div class="field">
                <label>Showing</label>
                <select class="input" [(ngModel)]="form.isActive">
                  <option [ngValue]="true">On — visible on the home page</option>
                  <option [ngValue]="false">Off — hidden, kept for later</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="close()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Save banner' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
    .head h1 { margin:0 0 4px; }
    .list { padding:6px 0; }
    .row { display:flex; align-items:center; gap:14px; padding:12px 18px; border-bottom:1px solid var(--line); }
    .row:last-child { border-bottom:none; }
    .row.off { opacity:.55; }
    .thumb { width:104px; height:52px; object-fit:cover; border-radius:8px; flex:none; background: var(--cream-deep); }
    .row-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
    .row-main .sub { font-size:.85rem; color: var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .row-main code { font-size:.72rem; color: var(--muted); }
    .pill { border:1px solid var(--line); background:#fff; border-radius:999px; padding:5px 12px; cursor:pointer;
      font-family: var(--font-body); font-weight:700; font-size:.78rem; color: var(--muted); white-space:nowrap; }
    .pill.on { background: var(--brand-soft); border-color: var(--brand); color:var(--ink); }
    .order, .actions { display:flex; gap:2px; }
    .icon-btn { background:none; border:none; font-size:1rem; cursor:pointer; padding:5px 7px; border-radius:8px; }
    .icon-btn:hover:not(:disabled) { background: var(--cream); }
    .icon-btn:disabled { opacity:.3; cursor:not-allowed; }
    .hint { font-weight:600; color: var(--muted); font-size:.82rem; }
    .hint code { font-weight:700; }
    .mt-sm { margin-top:6px; }
    .two { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

    .img-row { display:flex; gap:8px; align-items:center; }
    .upload-btn { flex:none; width:40px; height:40px; display:grid; place-items:center; cursor:pointer;
      border:2px solid var(--line); border-radius: var(--radius-sm); background:#fff; }
    .upload-btn:hover { border-color: var(--brand); }
    .upload-btn.busy { opacity:.6; cursor:progress; }

    /* Shows the scrim and text placement before saving, so an admin can tell
       whether a busy photo will swallow the copy. */
    .preview { position:relative; margin-top:10px; height:120px; border-radius: var(--radius-sm); overflow:hidden; }
    .preview img { width:100%; height:100%; object-fit:cover; }
    .preview::before { content:''; position:absolute; inset:0;
      background: linear-gradient(90deg, rgba(28,24,22,.82) 0%, rgba(28,24,22,.5) 50%, rgba(28,24,22,.05) 80%); }
    .preview.light::before {
      background: linear-gradient(90deg, rgba(255,255,255,.9) 0%, rgba(255,255,255,.6) 50%, rgba(255,255,255,.1) 80%); }
    .preview-copy { position:absolute; inset:0; z-index:1; display:flex; flex-direction:column; justify-content:center;
      gap:3px; padding:0 18px; color:#fff; }
    .preview-copy strong { font-family: var(--font-display); font-size:1rem; }
    .preview-copy span { font-size:.78rem; opacity:.9; }
    .preview-copy em { font-style:normal; font-size:.72rem; font-weight:800; background: var(--accent);
      align-self:flex-start; padding:3px 10px; border-radius:999px; margin-top:3px; }
    .preview.light .preview-copy { color: var(--ink); }
    .preview.light .preview-copy em { color:#fff; }

    .overlay { position:fixed; inset:0; background:rgba(51,65,79,.5); display:grid; place-items:center; z-index:100; padding:20px; }
    .modal { width:min(620px,100%); max-height:90vh; display:flex; flex-direction:column; }
    .modal-head, .modal-foot { display:flex; align-items:center; justify-content:space-between; padding:16px 22px; }
    .modal-head { border-bottom:1px solid var(--line); }
    .modal-foot { border-top:1px solid var(--line); gap:10px; justify-content:flex-end; }
    .modal-body { padding:22px; overflow-y:auto; }
    .modal-head h3 { margin:0; }

    @media (max-width:760px) {
      .row { flex-wrap:wrap; }
      .row-main { flex-basis:100%; order:3; }
      .two { grid-template-columns:1fr; }
    }
  `],
})
export class AdminBannersComponent implements OnInit {
  banners = signal<Banner[]>([]);
  loading = signal(true);
  saving = signal(false);
  uploading = signal(false);
  showForm = signal(false);
  editing = signal<Banner | null>(null);
  error = signal('');
  form = this.blank();

  constructor(private svc: BannerService, private uploads: UploadService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.svc.adminAll().subscribe({
      next: (b) => { this.banners.set(b); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  activeCount() { return this.banners().filter((b) => b.isActive).length; }

  blank() {
    return {
      title: '', subtitle: '', image: '', link: '/shop',
      ctaLabel: 'Shop now', theme: 'dark' as 'dark' | 'light', isActive: true,
    };
  }

  openNew() {
    this.editing.set(null);
    this.form = this.blank();
    this.error.set('');
    this.showForm.set(true);
  }

  edit(b: Banner) {
    this.editing.set(b);
    this.form = {
      title: b.title,
      subtitle: b.subtitle || '',
      image: b.image,
      link: b.link || '/shop',
      ctaLabel: b.ctaLabel || 'Shop now',
      theme: b.theme || 'dark',
      isActive: b.isActive !== false,
    };
    this.error.set('');
    this.showForm.set(true);
  }

  close() { this.showForm.set(false); }

  uploadImage(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.uploads.image(file).subscribe({
      next: (r) => { this.form.image = r.url; this.uploading.set(false); input.value = ''; },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not upload that image.');
        this.uploading.set(false);
      },
    });
  }

  save() {
    if (!this.form.title.trim()) { this.error.set('Please give the banner a title.'); return; }
    if (!this.form.image.trim()) { this.error.set('Please add a background image.'); return; }

    this.saving.set(true);
    const req = this.editing()
      ? this.svc.update(this.editing()!._id, this.form)
      : this.svc.create(this.form);

    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.reload(); },
      error: (err) => { this.error.set(err.error?.message || 'Could not save.'); this.saving.set(false); },
    });
  }

  /** Show/hide without opening the form — the switch admins reach for most. */
  toggle(b: Banner) {
    this.svc.update(b._id, { isActive: !b.isActive }).subscribe({
      next: () => this.reload(),
      error: (err) => alert(err.error?.message || 'Could not update that banner.'),
    });
  }

  /**
   * Swaps a banner with its neighbour. Both rows are rewritten with explicit
   * positions so the list can't end up with two slides claiming the same one.
   */
  move(i: number, delta: 1 | -1) {
    const list = [...this.banners()];
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.banners.set(list);

    this.svc.update(list[i]._id, { order: i }).subscribe({
      next: () => this.svc.update(list[j]._id, { order: j }).subscribe({
        next: () => this.reload(),
        error: () => this.reload(),
      }),
      error: () => this.reload(),
    });
  }

  remove(b: Banner) {
    if (!confirm(`Delete the banner "${b.title}"? This cannot be undone.`)) return;
    this.svc.remove(b._id).subscribe({
      next: () => this.reload(),
      error: (err) => alert(err.error?.message || 'Could not delete that banner.'),
    });
  }
}
