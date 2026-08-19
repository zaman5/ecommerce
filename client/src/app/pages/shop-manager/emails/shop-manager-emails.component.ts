import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ShopManagerNavComponent } from '../shop-manager-nav.component';
import { EmailTemplateService, UploadService } from '../../../core/services/api.service';
import { EmailTemplate } from '../../../core/models/models';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-shop-manager-emails',
  standalone: true,
  imports: [CommonModule, FormsModule, ShopManagerNavComponent, MediaUrlPipe],
  template: `
    <app-shop-manager-nav />
    <div class="admin-page">
      <div class="container">
        
        <!-- Header -->
        <div class="page-head">
          <div>
            <h1>Email Template Designer</h1>
            <p class="text-muted">
              Customize customer notification emails sent for orders.
            </p>
          </div>
          <div class="head-actions">
            <button class="btn btn-ghost" (click)="openTestModal()">
              ✉️ Send Test Email
            </button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveCurrent()">
              {{ saving() ? 'Saving…' : '💾 Save Template' }}
            </button>
          </div>
        </div>

        @if (feedback()) {
          <div class="alert alert-success mt-sm">{{ feedback() }}</div>
        }
        @if (error()) {
          <div class="alert alert-error mt-sm">{{ error() }}</div>
        }

        <!-- Template Type Switcher Tabs -->
        <div class="type-tabs">
          <button
            class="type-tab"
            [class.active]="activeType() === 'order_confirmation'"
            (click)="selectType('order_confirmation')"
          >
            <span class="tab-icon">🛍️</span>
            <div class="tab-meta">
              <strong>Order Confirmation</strong>
              <small>Sent immediately when order is placed</small>
            </div>
          </button>

          <button
            class="type-tab"
            [class.active]="activeType() === 'order_shipped'"
            (click)="selectType('order_shipped')"
          >
            <span class="tab-icon">🚚</span>
            <div class="tab-meta">
              <strong>Order Dispatched / Shipped</strong>
              <small>Sent when tracking/dispatch is assigned</small>
            </div>
          </button>

          <button
            class="type-tab"
            [class.active]="activeType() === 'order_delivered'"
            (click)="selectType('order_delivered')"
          >
            <span class="tab-icon">🎉</span>
            <div class="tab-meta">
              <strong>Order Delivered</strong>
              <small>Sent on delivery with review reminder</small>
            </div>
          </button>
        </div>

        @if (loading()) {
          <div class="card center py-xl">
            <div class="spinner"></div>
            <p class="text-muted mt-sm">Loading email templates…</p>
          </div>
        } @else if (current()) {
          
          <div class="editor-grid">
            
            <!-- Left: Design & Copy Controls -->
            <div class="card edit-card">
              <div class="card-head">
                <h3>Template Content & Styling</h3>
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="current()!.isActive" />
                  <span>Send Automatically</span>
                </label>
              </div>

              <!-- Subject -->
              <div class="field">
                <label>
                  Email Subject Line
                  <span class="hint">— What the recipient sees in their inbox</span>
                </label>
                <input class="input" [(ngModel)]="current()!.subject" placeholder="e.g. Order Confirmed: #{{ '{{' }}orderNumber{{ '}}' }}" />
                <div class="tag-pills mt-xs">
                  <span class="tag-hint">Click to insert tag:</span>
                  <button type="button" class="tag-pill" (click)="insertTag('subject', '{{orderNumber}}')">{{ '{{' }}orderNumber{{ '}}' }}</button>
                  <button type="button" class="tag-pill" (click)="insertTag('subject', '{{customerName}}')">{{ '{{' }}customerName{{ '}}' }}</button>
                </div>
              </div>

              <!-- Heading & Subtitle -->
              <div class="form-row">
                <div class="field flex-1">
                  <label>Header Title</label>
                  <input class="input" [(ngModel)]="current()!.heading" placeholder="Thank You for Your Order!" />
                </div>
                <div class="field flex-1">
                  <label>Brand Accent Color</label>
                  <div class="color-picker-row">
                    <input type="color" class="color-swatch" [(ngModel)]="current()!.brandColor" />
                    <input class="input font-mono" [(ngModel)]="current()!.brandColor" style="max-width:110px;" />
                    <div class="preset-colors">
                      <button type="button" class="dot" style="background:#1f6b60" (click)="current()!.brandColor = '#1f6b60'" title="Emerald"></button>
                      <button type="button" class="dot" style="background:#1e3a8a" (click)="current()!.brandColor = '#1e3a8a'" title="Navy"></button>
                      <button type="button" class="dot" style="background:#4f46e5" (click)="current()!.brandColor = '#4f46e5'" title="Indigo"></button>
                      <button type="button" class="dot" style="background:#e11d48" (click)="current()!.brandColor = '#e11d48'" title="Rose"></button>
                      <button type="button" class="dot" style="background:#16a34a" (click)="current()!.brandColor = '#16a34a'" title="Forest Green"></button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="field">
                <label>Header Subtitle / Tagline</label>
                <input class="input" [(ngModel)]="current()!.subtitle" placeholder="We've received your order..." />
              </div>

              <!-- Header Banner Image -->
              <div class="field">
                <label>Header Banner Image <span class="hint">— optional image banner at top</span></label>
                <div class="flex gap-sm align-center">
                  <input class="input flex-1" [(ngModel)]="current()!.headerBanner" placeholder="Paste image link or upload" />
                  <label class="upload-btn" [class.busy]="uploadingBanner()" title="Upload banner image">
                    {{ uploadingBanner() ? '…' : '📁' }}
                    <input type="file" accept="image/*" hidden (change)="uploadBanner($event)" [disabled]="uploadingBanner()" />
                  </label>
                  @if (current()!.headerBanner) {
                    <button class="icon-btn" (click)="current()!.headerBanner = ''" title="Remove banner">✕</button>
                  }
                </div>
              </div>

              <!-- Intro Custom Message -->
              <div class="field">
                <label>Greeting & Message Body</label>
                <textarea class="textarea" rows="3" [(ngModel)]="current()!.customMessage" placeholder="Intro message displayed before order items..."></textarea>
                <div class="tag-pills mt-xs">
                  <button type="button" class="tag-pill" (click)="insertTag('customMessage', '{{customerName}}')">{{ '{{' }}customerName{{ '}}' }}</button>
                  <button type="button" class="tag-pill" (click)="insertTag('customMessage', '{{orderNumber}}')">{{ '{{' }}orderNumber{{ '}}' }}</button>
                  <button type="button" class="tag-pill" (click)="insertTag('customMessage', '{{trackingNote}}')">{{ '{{' }}trackingNote{{ '}}' }}</button>
                </div>
              </div>

              <!-- Closing Note -->
              <div class="field">
                <label>Closing Message</label>
                <textarea class="textarea" rows="2" [(ngModel)]="current()!.closingMessage" placeholder="Closing note displayed after the order total..."></textarea>
              </div>

              <!-- Footer Contact Note -->
              <div class="field">
                <label>Footer Text & Contact Support Note</label>
                <input class="input" [(ngModel)]="current()!.footerText" placeholder="Need help? Contact us at orders@wondercart.pk..." />
              </div>

              <!-- Attachments Section -->
              <div class="field border-top pt-md">
                <div class="flex justify-between align-center mb-sm">
                  <label class="m-0">
                    Mail Attachments
                    <span class="hint">— Automatic PDF receipts, warranties, or brochures</span>
                  </label>
                  <label class="btn btn-ghost btn-sm" [class.busy]="uploadingAttachment()">
                    {{ uploadingAttachment() ? 'Uploading…' : '📎 Add Attachment' }}
                    <input type="file" hidden (change)="uploadAttachment($event)" [disabled]="uploadingAttachment()" />
                  </label>
                </div>

                @if (current()!.attachments?.length) {
                  <div class="attachment-list">
                    @for (att of current()!.attachments; track $index) {
                      <div class="attachment-item">
                        <span class="att-icon">📄</span>
                        <div class="att-info">
                          <strong class="att-name">{{ att.name }}</strong>
                          <span class="att-size" *ngIf="att.size">{{ (att.size / 1024) | number:'1.0-1' }} KB</span>
                        </div>
                        <button class="icon-btn danger" (click)="removeAttachment($index)" title="Remove attachment">🗑️</button>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="hint">No attachments added to this email template yet.</p>
                }
              </div>

              <div class="actions-row mt-md">
                <button class="btn btn-primary btn-block" [disabled]="saving()" (click)="saveCurrent()">
                  {{ saving() ? 'Saving…' : '💾 Save Template Changes' }}
                </button>
              </div>

            </div>

            <!-- Right: Interactive Live Email Preview -->
            <div class="preview-wrap">
              <div class="preview-header">
                <div class="client-dots">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                </div>
                <span class="preview-title">Live Email Client Preview (Subject: {{ previewSubject() }})</span>
                <span class="badge badge-subtle">From: orders&#64;wondercart.pk</span>
              </div>

              <div class="preview-viewport">
                <div class="email-mockup" [innerHTML]="previewHtml()"></div>
              </div>
            </div>

          </div>

        }

      </div>
    </div>

    <!-- Test Send Modal -->
    @if (showTestModal()) {
      <div class="overlay" (click)="showTestModal.set(false)">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>Send Live Test Email</h2>
            <button class="icon-btn" (click)="showTestModal.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-muted">
              Sends an immediate test email using your outgoing SMTP server (<code>s13.hosterpk.com:465</code>).
            </p>

            <div class="field mt-sm">
              <label>Template</label>
              <input class="input" [value]="current()?.title || activeType()" disabled />
            </div>

            <div class="field">
              <label>Recipient Email Address *</label>
              <input
                class="input"
                type="email"
                [(ngModel)]="testRecipient"
                placeholder="e.g. yourname@example.com"
                (keyup.enter)="sendTest()"
              />
            </div>

            @if (testFeedback()) {
              <div class="alert alert-success">{{ testFeedback() }}</div>
            }
            @if (testError()) {
              <div class="alert alert-error">{{ testError() }}</div>
            }
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showTestModal.set(false)">Cancel</button>
            <button class="btn btn-primary" [disabled]="sendingTest() || !testRecipient" (click)="sendTest()">
              {{ sendingTest() ? 'Sending…' : '✉️ Send Test Email Now' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-page { padding: 24px 0 60px; background: var(--bg); min-height: 85vh; }
    .page-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .page-head h1 { margin: 0 0 4px; font-size: 1.8rem; }
    .head-actions { display: flex; gap: 10px; align-items: center; }

    /* Type tabs */
    .type-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .type-tab {
      display: flex; align-items: center; gap: 14px; padding: 14px 18px; text-align: left;
      background: #fff; border: 2px solid var(--line); border-radius: var(--radius);
      cursor: pointer; transition: all .15s ease;
    }
    .type-tab:hover { border-color: var(--brand-light); background: var(--cream); transform: translateY(-1px); }
    .type-tab.active { border-color: var(--brand); background: var(--brand-soft); box-shadow: 0 4px 14px rgba(31, 107, 96, 0.12); }
    .tab-icon { font-size: 1.6rem; flex: none; }
    .tab-meta strong { display: block; font-size: .96rem; color: var(--ink); }
    .tab-meta small { color: var(--muted); font-size: .78rem; }

    /* Editor Grid */
    .editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    @media (max-width: 1080px) {
      .editor-grid { grid-template-columns: 1fr; }
    }

    .edit-card { padding: 24px; border: 1px solid var(--line); }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .card-head h3 { margin: 0; font-size: 1.15rem; }

    .toggle-label { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: .88rem; cursor: pointer; }
    .toggle-label input { accent-color: var(--brand); width: 18px; height: 18px; }

    .form-row { display: flex; gap: 14px; }
    .color-picker-row { display: flex; align-items: center; gap: 8px; }
    .color-swatch { width: 44px; height: 42px; border-radius: var(--radius-sm); border: 2px solid var(--line); cursor: pointer; padding: 2px; }
    .preset-colors { display: flex; gap: 4px; }
    .preset-colors .dot { width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(0,0,0,.15); cursor: pointer; }

    .tag-pills { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .tag-hint { font-size: .75rem; color: var(--muted); font-weight: 600; }
    .tag-pill { background: var(--cream); border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; font-size: .75rem; font-family: var(--font-mono); color: var(--brand); cursor: pointer; font-weight: 700; }
    .tag-pill:hover { background: var(--brand-soft); border-color: var(--brand); }

    .upload-btn { width: 42px; height: 42px; display: grid; place-items: center; cursor: pointer; border: 1px solid var(--line); border-radius: 8px; background: #fff; font-size: 1.1rem; flex: none; }
    .upload-btn:hover { border-color: var(--brand); }
    .upload-btn.busy { opacity: .6; cursor: progress; }

    .attachment-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .attachment-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--soft); border-radius: 8px; border: 1px solid var(--line); }
    .att-icon { font-size: 1.2rem; }
    .att-info { flex: 1; min-width: 0; }
    .att-name { display: block; font-size: .88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .att-size { font-size: .75rem; color: var(--muted); }

    /* Preview Client */
    .preview-wrap {
      background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px rgba(15,23,42,0.18);
      border: 1px solid #334155; position: sticky; top: 20px;
    }
    .preview-header {
      background: #0f172a; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between;
      gap: 10px; border-bottom: 1px solid #334155; color: #94a3b8; font-size: .82rem;
    }
    .client-dots { display: flex; gap: 6px; }
    .client-dots .dot { width: 10px; height: 10px; border-radius: 50%; }
    .client-dots .dot.red { background: #ef4444; }
    .client-dots .dot.yellow { background: #f59e0b; }
    .client-dots .dot.green { background: #10b981; }
    .preview-title { font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
    .preview-viewport { max-height: 80vh; overflow-y: auto; background: #f1f5f9; padding: 20px; }

    /* Overlay & Modal */
    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: grid; place-items: center; z-index: 110; padding: 20px; }
    .modal { width: min(480px, 100%); padding: 0; overflow: hidden; }
    .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--line); }
    .modal-head h2 { margin: 0; font-size: 1.3rem; }
    .modal-body { padding: 20px 22px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--line); background: var(--soft); }
  `],
})
export class ShopManagerEmailsComponent implements OnInit {
  templates = signal<EmailTemplate[]>([]);
  activeType = signal<'order_confirmation' | 'order_shipped' | 'order_delivered'>('order_confirmation');
  current = signal<EmailTemplate | null>(null);
  loading = signal(true);
  saving = signal(false);
  feedback = signal('');
  error = signal('');

  uploadingBanner = signal(false);
  uploadingAttachment = signal(false);

  // Test send state
  showTestModal = signal(false);
  testRecipient = 'manager@wondercart.pk';
  sendingTest = signal(false);
  testFeedback = signal('');
  testError = signal('');

  constructor(
    private emailSvc: EmailTemplateService,
    private uploadSvc: UploadService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.emailSvc.list().subscribe({
      next: (list) => {
        this.templates.set(list);
        this.selectType(this.activeType());
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load email templates.');
        this.loading.set(false);
      },
    });
  }

  selectType(type: 'order_confirmation' | 'order_shipped' | 'order_delivered') {
    this.activeType.set(type);
    const found = this.templates().find((t) => t.type === type);
    if (found) {
      this.current.set(JSON.parse(JSON.stringify(found)));
    } else {
      this.current.set(null);
    }
  }

  insertTag(field: 'subject' | 'customMessage', tag: string) {
    const cur = this.current();
    if (!cur) return;
    if (field === 'subject') {
      cur.subject = (cur.subject || '') + ' ' + tag;
    } else if (field === 'customMessage') {
      cur.customMessage = (cur.customMessage || '') + ' ' + tag;
    }
  }

  uploadBanner(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.current()) return;

    this.uploadingBanner.set(true);
    this.error.set('');
    this.uploadSvc.image(file).subscribe({
      next: (r) => {
        this.current()!.headerBanner = r.url;
        this.uploadingBanner.set(false);
        input.value = '';
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Banner upload failed.');
        this.uploadingBanner.set(false);
        input.value = '';
      },
    });
  }

  uploadAttachment(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.current()) return;

    this.uploadingAttachment.set(true);
    this.error.set('');
    this.emailSvc.uploadAttachment(file).subscribe({
      next: (att) => {
        if (!this.current()!.attachments) this.current()!.attachments = [];
        this.current()!.attachments!.push(att);
        this.uploadingAttachment.set(false);
        input.value = '';
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Attachment upload failed (max 10MB).');
        this.uploadingAttachment.set(false);
        input.value = '';
      },
    });
  }

  removeAttachment(index: number) {
    this.current()?.attachments?.splice(index, 1);
  }

  saveCurrent() {
    const cur = this.current();
    if (!cur) return;
    this.saving.set(true);
    this.feedback.set('');
    this.error.set('');

    this.emailSvc.update(cur.type, cur).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.feedback.set(`Template "${cur.title}" saved successfully!`);
        setTimeout(() => this.feedback.set(''), 4000);
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Failed to save template.');
      },
    });
  }

  openTestModal() {
    this.testFeedback.set('');
    this.testError.set('');
    this.showTestModal.set(true);
  }

  sendTest() {
    if (!this.testRecipient || !this.current()) return;
    this.sendingTest.set(true);
    this.testFeedback.set('');
    this.testError.set('');

    this.emailSvc
      .testSend({
        to: this.testRecipient,
        type: this.activeType(),
        template: this.current()!,
      })
      .subscribe({
        next: (res) => {
          this.sendingTest.set(false);
          this.testFeedback.set(res.message || 'Test email sent successfully!');
          setTimeout(() => this.showTestModal.set(false), 3000);
        },
        error: (err) => {
          this.sendingTest.set(false);
          this.testError.set(err.error?.message || 'Failed to send test email. Verify SMTP credentials.');
        },
      });
  }

  previewSubject(): string {
    const s = this.current()?.subject || '';
    return s.replace(/{{orderNumber}}/g, '#BS-49201948').replace(/{{customerName}}/g, 'Valued Customer');
  }

  previewHtml(): SafeHtml {
    const c = this.current();
    if (!c) return '';
    const color = c.brandColor || '#1f6b60';
    const heading = (c.heading || 'Notification Title').replace(/{{orderNumber}}/g, '#BS-49201948');
    const subtitle = (c.subtitle || '').replace(/{{orderNumber}}/g, '#BS-49201948');
    const customMessage = (c.customMessage || '').replace(/{{orderNumber}}/g, '#BS-49201948').replace(/{{customerName}}/g, 'Ahmad Khan');
    const closingMessage = (c.closingMessage || '').replace(/{{orderNumber}}/g, '#BS-49201948');
    const footerText = c.footerText || 'Wondercart — Everything for your family and home.';

    const raw = `
      <div style="background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; font-family:sans-serif; max-width:520px; margin:0 auto;">
        <div style="background:${color}; padding:22px; text-align:center; color:#fff;">
          ${c.headerBanner ? `<img src="${c.headerBanner}" style="max-width:100%; border-radius:6px; margin-bottom:10px; display:block;" />` : ''}
          <h2 style="margin:0; font-size:20px; font-weight:800;">${heading}</h2>
          ${subtitle ? `<p style="margin:6px 0 0; font-size:13px; opacity:.9;">${subtitle}</p>` : ''}
        </div>
        <div style="padding:20px; font-size:14px; color:#334155;">
          ${customMessage ? `<p style="margin:0 0 16px; line-height:1.5;">${customMessage}</p>` : ''}
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:4px;">
              <span style="color:#64748b;">ORDER NUMBER</span>
              <span style="color:${color};">#BS-49201948</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:#64748b;">PAYMENT</span>
              <span style="color:#0f172a; font-weight:600;">JAZZCASH (PAID)</span>
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:16px;">
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 0;"><strong>Wonder Baby Cotton Romper</strong><br><small style="color:#64748b;">Colour: Sky Blue</small></td>
              <td style="text-align:center;">× 2</td>
              <td style="text-align:right; font-weight:700;">Rs 2,500</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 0;"><strong>Toddler Learning Blocks</strong></td>
              <td style="text-align:center;">× 1</td>
              <td style="text-align:right; font-weight:700;">Rs 1,000</td>
            </tr>
          </table>
          <div style="border-top:1px solid #e2e8f0; padding-top:8px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:800;">
              <span>Grand Total:</span>
              <span style="color:${color};">Rs 3,750</span>
            </div>
          </div>
          ${closingMessage ? `<p style="font-size:13px; color:#64748b; margin:0 0 16px;">${closingMessage}</p>` : ''}
          <div style="text-align:center; padding:8px 0;">
            <span style="background:${color}; color:#fff; padding:10px 24px; border-radius:999px; font-size:13px; font-weight:700; display:inline-block;">Track Order</span>
          </div>
        </div>
        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:14px; text-align:center; font-size:11px; color:#94a3b8;">
          ${footerText}
        </div>
      </div>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}
