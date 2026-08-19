import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, UploadService } from '../../../core/services/api.service';
import { AdminNavComponent } from '../admin-nav.component';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-jazzcash-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, MediaUrlPipe],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />
        <h1>JazzCash Payment Settings</h1>
        <p class="text-muted">Set the account number and QR code displayed to customers choosing JazzCash at checkout.</p>

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
                <label>JazzCash Account Phone Number <span class="req">*</span></label>
                <input class="input" [(ngModel)]="phone" name="phone" placeholder="03038164288" required />
                <small class="hint">This number is shown to customers at checkout to send payments.</small>
              </div>

              <div class="field mt">
                <label>JazzCash QR Code Image</label>
                <p class="hint">Upload your JazzCash QR code so customers can easily scan and pay from their banking app.</p>

                @if (qrImage()) {
                  <div class="qr-preview-box">
                    <img [src]="qrImage() | mediaUrl" alt="JazzCash QR" class="qr-img" />
                    <div class="qr-actions">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="qrImage.set('')">✕ Remove QR</button>
                    </div>
                  </div>
                }

                <label class="upload-area mt-sm" [class.uploading]="uploadingQr()">
                  <input type="file" accept="image/*" (change)="onQrUpload($event)" hidden />
                  @if (uploadingQr()) {
                    <span>⏳ Uploading QR code…</span>
                  } @else {
                    <span>📷 {{ qrImage() ? 'Replace QR code image' : 'Upload QR code image' }}</span>
                    <span class="sub">PNG, JPG or WebP</span>
                  }
                </label>
              </div>

              <div class="mt-lg">
                <button type="submit" class="btn btn-primary" [disabled]="saving()">
                  {{ saving() ? 'Saving…' : 'Save Settings' }}
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
    .hint { color: var(--muted); font-size: .85rem; margin-top: 4px; }
    .sub { color: var(--muted); font-size: .8rem; }
    .qr-preview-box { display: flex; align-items: center; gap: 16px; margin: 12px 0; padding: 14px; background: var(--cream); border-radius: 12px; border: 1px solid var(--line); flex-wrap: wrap; }
    .qr-img { width: 140px; height: 140px; object-fit: contain; background: #fff; border-radius: 8px; border: 1px solid var(--line); }
    .upload-area { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 2px dashed var(--line); border-radius: 12px; padding: 24px; cursor: pointer; text-align: center; font-weight: 600; }
    .upload-area:hover { border-color: var(--brand); background: rgba(255,107,74,.04); }
    .upload-area.uploading { opacity: .7; pointer-events: none; }
    .mt-sm { margin-top: 8px; }
  `],
})
export class AdminJazzcashSettingsComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  uploadingQr = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  phone = '03038164288';
  qrImage = signal('');

  constructor(
    private settingsSvc: SettingsService,
    private uploadSvc: UploadService
  ) {}

  ngOnInit() {
    this.settingsSvc.getJazzCash().subscribe({
      next: (s) => {
        this.phone = s.phone || '03038164288';
        this.qrImage.set(s.qrImage || '');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onQrUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingQr.set(true);
    this.errorMessage.set('');
    this.uploadSvc.paymentScreenshot(file).subscribe({
      next: (res) => {
        this.qrImage.set(res.url);
        this.uploadingQr.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to upload QR image.');
        this.uploadingQr.set(false);
      },
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.settingsSvc.updateJazzCash({
      phone: this.phone.trim(),
      qrImage: this.qrImage(),
    }).subscribe({
      next: () => {
        this.successMessage.set('Settings saved successfully!');
        this.saving.set(false);
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to save settings.');
        this.saving.set(false);
      },
    });
  }
}
