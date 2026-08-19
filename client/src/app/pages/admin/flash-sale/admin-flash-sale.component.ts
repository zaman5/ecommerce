import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FlashSaleService, ProductService } from '../../../core/services/api.service';
import { FlashSale } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-admin-flash-sale',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminNavComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />

        <div class="head">
          <div>
            <h1>Flash Sale</h1>
            <p class="text-muted">
              The deals strip at the top of the home page. Products join it from the
              <a routerLink="/admin/products">⚡ Flash Sale</a> switch on their own edit form —
              {{ dealCount() === null ? '…' : dealCount() }} product(s) are in it right now.
              This page controls how the strip looks and when it runs.
            </p>
          </div>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          @if (saved()) { <div class="alert alert-success">Saved — the home page is updated.</div> }

          <div class="cols">
            <div class="card card-pad">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="form.isEnabled" />
                <span>
                  <strong>Show the Flash Sale section</strong>
                  <em>Turn off to hide the whole strip without losing these settings.</em>
                </span>
              </label>

              <hr />

              <div class="field">
                <label>Heading</label>
                <input class="input" [(ngModel)]="form.title" maxlength="80" placeholder="⚡ Flash Sale" />
                <p class="hint">Emoji work here — paste one straight in.</p>
              </div>

              <div class="two">
                <div class="field">
                  <label>Button text</label>
                  <input class="input" [(ngModel)]="form.ctaLabel" maxlength="60" placeholder="Shop All Deals" />
                  <p class="hint">Leave blank to hide the button. The › is added for you.</p>
                </div>
                <div class="field">
                  <label>Button links to</label>
                  <input class="input" [(ngModel)]="form.ctaLink" maxlength="300" placeholder="/shop?deals=true" />
                </div>
              </div>

              <hr />

              <div class="field">
                <label>Countdown</label>
                <select class="input" [(ngModel)]="form.countdownMode">
                  <option value="midnight">Daily — resets at midnight each night</option>
                  <option value="endsAt">Until a date and time I choose</option>
                  <option value="none">No countdown</option>
                </select>
              </div>

              @if (form.countdownMode !== 'none') {
                <div class="field">
                  <label>Timer label</label>
                  <input class="input" [(ngModel)]="form.timerLabel" maxlength="60" placeholder="On Sale Ends In" />
                </div>
              }

              @if (form.countdownMode === 'endsAt') {
                <div class="field">
                  <label>Sale ends</label>
                  <input class="input" type="datetime-local" [(ngModel)]="form.endsAtLocal" />
                  <p class="hint">
                    Your local time. When it passes the section hides itself automatically —
                    a sale stuck at 00:00:00 looks worse than no sale.
                    @if (endsAtPassed()) { <strong class="warn"> That time is already in the past.</strong> }
                  </p>
                </div>
              }

              <hr />

              <div class="two">
                <div class="field">
                  <label>Products to show</label>
                  <input class="input" type="number" min="4" max="24" [(ngModel)]="form.limit" />
                  <p class="hint">Between 4 and 24.</p>
                </div>
                <div class="field">
                  <label>Order them by</label>
                  <select class="input" [(ngModel)]="form.sort">
                    <option value="popular">Best selling</option>
                    <option value="newest">Newest first</option>
                    <option value="priceLow">Cheapest first</option>
                    <option value="priceHigh">Most expensive first</option>
                    <option value="rating">Top rated</option>
                  </select>
                </div>
              </div>

              <div class="actions">
                <button class="btn btn-ghost" [disabled]="saving()" (click)="reload()">Undo changes</button>
                <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
                  {{ saving() ? 'Saving…' : 'Save changes' }}
                </button>
              </div>
            </div>

            <!-- Live preview of the strip's head — the part being edited. -->
            <aside class="card card-pad preview-card">
              <h2>Preview</h2>
              @if (!form.isEnabled) {
                <p class="off-note">The section is switched off, so nothing shows on the home page.</p>
              } @else {
                <div class="flash-head">
                  <h3>{{ form.title || 'Your heading' }}</h3>
                  @if (form.countdownMode !== 'none') {
                    <div class="timer">
                      <span>{{ form.timerLabel || 'On Sale Ends In' }}</span>
                      <b>{{ previewCountdown() }}</b>
                    </div>
                  }
                  @if (form.ctaLabel) { <span class="see">{{ form.ctaLabel }} ›</span> }
                </div>
                <p class="hint mt">
                  Followed by {{ form.limit }} discounted product(s), {{ sortLabel() }}.
                </p>
              }
            </aside>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .head { margin-bottom: 20px; }
    .head h1 { margin: 0 0 4px; }
    .head p { max-width: 72ch; margin: 0; }
    .cols { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 22px; align-items: start; }
    hr { border: none; border-top: 1px solid var(--line); margin: 20px 0; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .hint { font-weight: 600; color: var(--muted); font-size: .82rem; margin: 6px 0 0; }
    .hint .warn { color: var(--danger); }
    .mt { margin-top: 12px; }

    .switch { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
    .switch input { width: 20px; height: 20px; margin-top: 2px; flex: none; }
    .switch strong { display: block; font-family: var(--font-display); }
    .switch em { font-style: normal; font-size: .84rem; color: var(--muted); }

    .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }

    .preview-card h2 { font-size: 1.05rem; margin: 0 0 14px; }
    .off-note { color: var(--muted); font-size: .9rem; margin: 0; }
    /* Mirrors the home page's .flash-head so the preview is honest. */
    .flash-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      background: var(--cream); border-radius: var(--radius-sm); padding: 14px 16px; }
    .flash-head h3 { font-size: 1.15rem; margin: 0; }
    .timer { display: flex; align-items: center; gap: 8px; font-size: .78rem; color: var(--muted); }
    .timer b { font-family: var(--font-display); background: var(--ink); color: #fff; padding: 3px 10px;
      border-radius: 6px; font-size: .86rem; letter-spacing: .5px; font-variant-numeric: tabular-nums; }
    .see { color: var(--ink); font-weight: 700; font-size: .85rem; margin-left: auto; white-space: nowrap; }
    .see:hover { color: var(--brand); }

    @media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .two { grid-template-columns: 1fr; } }
  `],
})
export class AdminFlashSaleComponent implements OnInit, OnDestroy {
  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  error = signal('');
  dealCount = signal<number | null>(null);
  previewCountdown = signal('00:00:00');

  form = this.blank();
  private timer?: ReturnType<typeof setInterval>;

  constructor(private svc: FlashSaleService, private products: ProductService) {}

  ngOnInit() {
    this.reload();
    // Tells the admin how many products the strip has to work with, so a limit
    // of 24 against 6 opted-in lines is obviously wrong before they save it.
    this.products.list({ flashSale: true, limit: 4 }).subscribe({
      next: (r) => this.dealCount.set(r.total),
      error: () => this.dealCount.set(null),
    });
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  blank() {
    return {
      isEnabled: true,
      title: '⚡ Flash Sale',
      countdownMode: 'midnight' as FlashSale['countdownMode'],
      timerLabel: 'On Sale Ends In',
      endsAtLocal: '',
      ctaLabel: 'Shop All Deals',
      ctaLink: '/shop?deals=true',
      limit: 12,
      sort: 'popular' as FlashSale['sort'],
    };
  }

  reload() {
    this.loading.set(true);
    this.error.set('');
    this.svc.get().subscribe({
      next: (s) => {
        this.form = {
          isEnabled: s.isEnabled,
          title: s.title,
          countdownMode: s.countdownMode,
          timerLabel: s.timerLabel,
          endsAtLocal: this.toLocalInput(s.endsAt),
          ctaLabel: s.ctaLabel,
          ctaLink: s.ctaLink,
          limit: s.limit,
          sort: s.sort,
        };
        this.loading.set(false);
      },
      error: () => { this.error.set('Could not load the settings.'); this.loading.set(false); },
    });
  }

  save() {
    this.error.set('');
    this.saved.set(false);
    if (!this.form.title.trim()) { this.error.set('The section needs a heading.'); return; }
    if (!this.form.ctaLink.trim()) { this.error.set('The button needs a link.'); return; }
    if (this.form.countdownMode === 'endsAt' && !this.form.endsAtLocal) {
      this.error.set('Pick the date and time the sale ends, or switch the countdown to daily.');
      return;
    }

    this.saving.set(true);
    this.svc.update({
      isEnabled: this.form.isEnabled,
      title: this.form.title,
      countdownMode: this.form.countdownMode,
      timerLabel: this.form.timerLabel,
      // datetime-local has no timezone, so let Date read it as local time and
      // send an absolute instant — the shopper's browser converts it back.
      endsAt: this.form.endsAtLocal ? new Date(this.form.endsAtLocal).toISOString() : null,
      ctaLabel: this.form.ctaLabel,
      ctaLink: this.form.ctaLink,
      limit: Number(this.form.limit),
      sort: this.form.sort,
    }).subscribe({
      next: () => { this.saving.set(false); this.saved.set(true); setTimeout(() => this.saved.set(false), 4000); },
      error: (err) => { this.error.set(err.error?.message || 'Could not save.'); this.saving.set(false); },
    });
  }

  endsAtPassed(): boolean {
    return !!this.form.endsAtLocal && new Date(this.form.endsAtLocal).getTime() <= Date.now();
  }

  sortLabel(): string {
    return {
      popular: 'best selling first', newest: 'newest first', priceLow: 'cheapest first',
      priceHigh: 'most expensive first', rating: 'top rated first',
    }[this.form.sort];
  }

  /** ISO instant → the `YYYY-MM-DDTHH:mm` datetime-local wants, in local time. */
  private toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Same clock the home page runs, so the preview matches what shoppers see. */
  private tick() {
    const now = new Date();
    let target: Date;
    if (this.form.countdownMode === 'endsAt') {
      if (!this.form.endsAtLocal) { this.previewCountdown.set('—'); return; }
      target = new Date(this.form.endsAtLocal);
      if (target.getTime() <= now.getTime()) { this.previewCountdown.set('ended'); return; }
    } else {
      target = new Date(now);
      target.setHours(24, 0, 0, 0);
    }
    const left = Math.max(0, target.getTime() - now.getTime());
    const pad = (n: number) => String(n).padStart(2, '0');
    const days = Math.floor(left / 86_400_000);
    const h = Math.floor((left % 86_400_000) / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const s = Math.floor((left % 60_000) / 1000);
    this.previewCountdown.set(days > 0 ? `${days}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`);
  }
}
