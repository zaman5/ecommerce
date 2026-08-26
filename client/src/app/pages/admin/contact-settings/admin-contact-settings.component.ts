import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/api.service';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-admin-contact-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent],
  template: `
    <section [class.section]="!embedded">
      <div [class.container]="!embedded">
        @if (!embedded) {
          <app-admin-nav />
          <h1>📞 Store Contact &amp; UAN Settings</h1>
          <p class="text-muted">Configure the official UAN helpline number, support email, and operational hours displayed across the store.</p>
        }

        @if (loading()) {
          <div class="spinner"></div>
        } @else {
          <div class="card card-pad max-w mt">
            @if (successMessage()) {
              <div class="alert alert-success">{{ successMessage() }}</div>
            }
            @if (errorMessage()) {
              <div class="alert alert-error">{{ errorMessage() }}</div>
            }

            <form (ngSubmit)="saveSettings()">
              <div class="field">
                <label>UAN / Helpline Number <span class="req">*</span></label>
                <input
                  class="input"
                  [(ngModel)]="uan"
                  name="uan"
                  placeholder="e.g. 051-111-966-337 or [To be updated]"
                  required
                />
                <small class="hint">This UAN or phone number will be displayed in the Contact Us page, footer, and Terms &amp; Conditions.</small>
              </div>

              <div class="field mt">
                <label>Customer Support Email <span class="req">*</span></label>
                <input
                  class="input"
                  type="email"
                  [(ngModel)]="supportEmail"
                  name="supportEmail"
                  placeholder="support@wondercart.pk"
                  required
                />
                <small class="hint">Official support email shown to customers for inquiries and returns.</small>
              </div>

              <div class="field mt">
                <label>Customer Support Hours</label>
                <input
                  class="input"
                  [(ngModel)]="supportHours"
                  name="supportHours"
                  placeholder="Monday to Saturday, 9am – 6pm (PKT)"
                />
                <small class="hint">Operating hours when customer service is available.</small>
              </div>

              <!-- Live Preview Box -->
              <div class="preview-box mt">
                <div class="preview-title">👁️ Live Store Preview</div>
                <div class="preview-line">
                  <span class="preview-ico">📞</span>
                  <div>
                    <strong>UAN</strong>
                    <span class="uan-preview">{{ uan || '[To be updated]' }}</span>
                  </div>
                </div>
                <div class="preview-line">
                  <span class="preview-ico">✉️</span>
                  <div>
                    <strong>Email</strong>
                    <span>{{ supportEmail || 'support@wondercart.pk' }}</span>
                  </div>
                </div>
                <div class="preview-line">
                  <span class="preview-ico">⏰</span>
                  <div>
                    <strong>Hours</strong>
                    <span>{{ supportHours || 'Monday to Saturday, 9am – 6pm (PKT)' }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-lg">
                <button type="submit" class="btn btn-primary" [disabled]="saving()">
                  {{ saving() ? 'Saving…' : 'Save Contact Settings' }}
                </button>
              </div>
            </form>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .max-w { max-width: 600px; }
    .req { color: var(--accent); }
    .hint { color: var(--muted); font-size: .85rem; margin-top: 4px; display: block; }
    .preview-box { background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 16px 18px; margin-top: 20px; }
    .preview-title { font-weight: 700; font-size: 0.85rem; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; }
    .preview-line { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
    .preview-line:last-child { border-bottom: none; }
    .preview-ico { font-size: 1.1rem; }
    .preview-line strong { min-width: 60px; color: #1e293b; }
    .uan-preview { font-weight: 700; color: var(--brand); }
  `],
})
export class AdminContactSettingsComponent implements OnInit {
  @Input() embedded = false;
  loading = signal(true);
  saving = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  uan = '[To be updated]';
  supportEmail = 'support@wondercart.pk';
  supportHours = 'Monday to Saturday, 9am – 6pm (PKT)';

  constructor(private settingsSvc: SettingsService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.settingsSvc.getContact().subscribe({
      next: (res) => {
        this.uan = res.uan || '[To be updated]';
        this.supportEmail = res.supportEmail || 'support@wondercart.pk';
        this.supportHours = res.supportHours || 'Monday to Saturday, 9am – 6pm (PKT)';
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to load contact settings.');
        this.loading.set(false);
      },
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.settingsSvc
      .updateContact({
        uan: this.uan.trim(),
        supportEmail: this.supportEmail.trim(),
        supportHours: this.supportHours.trim(),
      })
      .subscribe({
        next: (res) => {
          this.uan = res.uan;
          this.supportEmail = res.supportEmail;
          this.supportHours = res.supportHours;
          this.successMessage.set('Contact & UAN settings saved successfully!');
          this.saving.set(false);
          setTimeout(() => this.successMessage.set(''), 4000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Failed to update contact settings.');
          this.saving.set(false);
        },
      });
  }
}
