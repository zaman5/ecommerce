import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/api.service';
import { SocialSettings, SocialTestResponse } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-admin-social-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent],
  template: `
    <section [class.section]="!embedded">
      <div [class.container]="!embedded">
        @if (!embedded) {
          <app-admin-nav />
        }
        
        <div class="head-row">
          <div>
            <h1>📘 Facebook & Instagram Integration</h1>
            <p class="text-muted">Connect your Meta accounts to automatically post new products to your Facebook Page and Instagram feed.</p>
          </div>
          <div class="status-pill" [class.connected]="isConfigured()">
            <span class="dot"></span>
            {{ isConfigured() ? 'Connected' : 'Not Configured' }}
          </div>
        </div>

        @if (loading()) {
          <div class="spinner"></div>
        } @else {
          <div class="grid-layout mt">
            <!-- Left column: Settings Form -->
            <div class="card card-pad">
              @if (successMessage()) {
                <div class="alert alert-success">{{ successMessage() }}</div>
              }
              @if (errorMessage()) {
                <div class="alert alert-error">{{ errorMessage() }}</div>
              }

              <form (ngSubmit)="saveSettings()">
                <!-- Facebook Page Credentials -->
                <div class="section-title">
                  <span class="icon">📘</span>
                  <h3>Facebook Page Configuration</h3>
                </div>

                <div class="field">
                  <label>Facebook Page ID <span class="req">*</span></label>
                  <input class="input" [(ngModel)]="form.facebookPageId" name="facebookPageId" placeholder="e.g. 104829104928172" required />
                  <small class="hint">Found in your Facebook Page > About > Page Transparency or Page Info.</small>
                </div>

                <div class="field mt">
                  <div class="label-row">
                    <label>Facebook Page Access Token <span class="req">*</span></label>
                    <button type="button" class="btn-text" (click)="showToken = !showToken">
                      {{ showToken ? '🙈 Hide' : '👁️ Show' }}
                    </button>
                  </div>
                  <input class="input token-input" [type]="showToken ? 'text' : 'password'" [(ngModel)]="form.facebookPageAccessToken" name="facebookPageAccessToken" placeholder="EAA..." required />
                  <small class="hint">Permanent Page Access Token with <code>pages_manage_posts</code> and <code>pages_read_engagement</code> permissions.</small>
                </div>

                <!-- Instagram Configuration -->
                <div class="section-title mt-lg">
                  <span class="icon">📸</span>
                  <h3>Instagram Business Configuration</h3>
                </div>

                <div class="field">
                  <label>Instagram Business Account ID <span class="hint">(Optional)</span></label>
                  <input class="input" [(ngModel)]="form.instagramAccountId" name="instagramAccountId" placeholder="e.g. 17841400000000000" />
                  <small class="hint">Your Instagram account must be a Business/Creator account connected to your Facebook Page.</small>
                </div>

                <!-- Defaults for Product Addition -->
                <div class="section-title mt-lg">
                  <span class="icon">⚙️</span>
                  <h3>Publishing Preferences</h3>
                </div>

                <div class="toggles-list">
                  <label class="toggle-card" [class.active]="form.facebookAutoPost">
                    <input type="checkbox" [(ngModel)]="form.facebookAutoPost" name="facebookAutoPost" />
                    <div class="toggle-content">
                      <strong>Auto-check "Post to Facebook" when adding products</strong>
                      <span>Automatically post new products to Facebook Page feed when saving.</span>
                    </div>
                  </label>

                  <label class="toggle-card" [class.active]="form.instagramAutoPost">
                    <input type="checkbox" [(ngModel)]="form.instagramAutoPost" name="instagramAutoPost" />
                    <div class="toggle-content">
                      <strong>Auto-check "Post to Instagram" when adding products</strong>
                      <span>Automatically publish image and caption to Instagram feed.</span>
                    </div>
                  </label>
                </div>

                <!-- Post Caption Template -->
                <div class="section-title mt-lg">
                  <span class="icon">✍️</span>
                  <h3>Post Caption Template</h3>
                </div>

                <div class="field">
                  <div class="tokens-bar">
                    <span class="token-hint">Click to insert tag:</span>
                    <button type="button" class="token-btn" (click)="insertTag('{product_name}')">+ Name</button>
                    <button type="button" class="token-btn" (click)="insertTag('{price}')">+ Price</button>
                    <button type="button" class="token-btn" (click)="insertTag('{discount_text}')">+ Discount</button>
                    <button type="button" class="token-btn" (click)="insertTag('{product_url}')">+ Product Link</button>
                    <button type="button" class="token-btn" (click)="insertTag('{brand}')">+ Brand</button>
                  </div>
                  <textarea class="input template-area" rows="6" [(ngModel)]="form.socialPostTemplate" name="socialPostTemplate" placeholder="✨ New Arrival at WonderCart! ✨&#10;&#10;🛍️ {product_name}&#10;💰 Price: Rs {price}&#10;{discount_text}&#10;&#10;👉 Order now: {product_url}&#10;&#10;#WonderCart #BabyShop"></textarea>
                  <small class="hint">Use placeholders above to dynamically insert the product details into each social post.</small>
                </div>

                <!-- Action Buttons -->
                <div class="actions-row mt-lg">
                  <button type="submit" class="btn btn-primary" [disabled]="saving()">
                    {{ saving() ? 'Saving Settings…' : '💾 Save Settings' }}
                  </button>

                  <button type="button" class="btn btn-ghost" (click)="testConnection()" [disabled]="testing() || !form.facebookPageId || !form.facebookPageAccessToken">
                    {{ testing() ? 'Testing Connection…' : '⚡ Test Connection' }}
                  </button>
                </div>
              </form>

              <!-- Live Test Result Box -->
              @if (testResult(); as res) {
                <div class="test-result-box mt" [class.success]="res.success" [class.error]="!res.success">
                  <div class="test-head">
                    <span class="test-icon">{{ res.success ? '✅' : '❌' }}</span>
                    <strong>{{ res.message }}</strong>
                  </div>
                  @if (res.page; as page) {
                    <div class="page-preview mt-sm">
                      @if (page.pictureUrl) {
                        <img [src]="page.pictureUrl" alt="Page Picture" class="page-pic" />
                      }
                      <div>
                        <div class="page-title">{{ page.name }}</div>
                        <div class="page-sub">Page ID: <code>{{ page.id }}</code></div>
                      </div>
                    </div>
                  }
                  @if (res.instagram; as ig) {
                    <div class="page-preview mt-sm">
                      @if (ig.pictureUrl) {
                        <img [src]="ig.pictureUrl" alt="Instagram Picture" class="page-pic" />
                      }
                      <div>
                        <div class="page-title">📸 {{ ig.name || ig.username }}</div>
                        <div class="page-sub">Instagram ID: <code>{{ ig.id }}</code></div>
                      </div>
                    </div>
                  }
                  @if (res.instagramError) {
                    <div class="text-muted mt-sm text-sm">⚠️ Instagram note: {{ res.instagramError }}</div>
                  }
                </div>
              }
            </div>

            <!-- Right column: Help & Setup Guide -->
            <div class="side-col">
              <div class="card card-pad guide-card">
                <h3>📖 How to Connect Facebook & Instagram</h3>
                
                <div class="step">
                  <div class="step-num">1</div>
                  <div class="step-body">
                    <strong>Get Your Facebook Page ID</strong>
                    <p>Open your Facebook Page, click <em>About</em> &rarr; <em>Page transparency</em> (or copy the ID from the Page URL).</p>
                  </div>
                </div>

                <div class="step">
                  <div class="step-num">2</div>
                  <div class="step-body">
                    <strong>Generate a Page Access Token</strong>
                    <p>Visit <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener">Meta Graph API Explorer</a>.</p>
                    <ul>
                      <li>Select your App and User Token.</li>
                      <li>Add permissions: <code>pages_manage_posts</code>, <code>pages_read_engagement</code>, <code>pages_show_list</code>.</li>
                      <li>Generate a <strong>Page Access Token</strong> for your shop page.</li>
                    </ul>
                  </div>
                </div>

                <div class="step">
                  <div class="step-num">3</div>
                  <div class="step-body">
                    <strong>Connect Instagram (Optional)</strong>
                    <p>Ensure your Instagram account is linked to your Facebook Page in <em>Meta Business Suite &rarr; Settings &rarr; Instagram</em> with <code>instagram_content_publish</code> permissions.</p>
                  </div>
                </div>

                <div class="step">
                  <div class="step-num">4</div>
                  <div class="step-body">
                    <strong>Test & Start Auto-Posting</strong>
                    <p>Click <strong>Test Connection</strong> to confirm your credentials. When adding products in <em>Admin &rarr; Products</em>, check the <strong>Post to Facebook / Instagram</strong> checkboxes!</p>
                  </div>
                </div>
              </div>

              <!-- Preview Example Card -->
              <div class="card card-pad mt">
                <h4>✨ Example Post Preview</h4>
                <div class="post-mockup mt-sm">
                  <div class="mock-header">
                    <div class="mock-avatar">W</div>
                    <div>
                      <div class="mock-name">WonderCart Official</div>
                      <div class="mock-time">Just now · 🌍</div>
                    </div>
                  </div>
                  <div class="mock-body">
                    {{ previewCaption() }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .head-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: .85rem; padding: 6px 14px; border-radius: 999px; background: #fff1e8; color: #d05c26; border: 1px solid #fed7c3; }
    .status-pill.connected { background: #e6f7f2; color: #1f6b60; border-color: #a3e6d8; }
    .status-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .grid-layout { display: grid; grid-template-columns: 1.25fr 1fr; gap: 24px; }
    .section-title { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 14px; }
    .section-title h3 { margin: 0; font-size: 1.1rem; }
    .section-title .icon { font-size: 1.3rem; }
    .label-row { display: flex; justify-content: space-between; align-items: center; }
    .btn-text { background: none; border: none; font-weight: 700; font-size: .85rem; color: var(--brand); cursor: pointer; }
    .req { color: var(--accent); }
    .hint { color: var(--muted); font-size: .82rem; margin-top: 4px; display: block; }
    .hint code { background: var(--cream); padding: 2px 6px; border-radius: 4px; font-size: .8rem; }
    .toggles-list { display: flex; flex-direction: column; gap: 10px; }
    .toggle-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1.5px solid var(--line); border-radius: var(--radius-sm); background: #fff; cursor: pointer; transition: all .15s ease; }
    .toggle-card:hover { border-color: var(--brand); }
    .toggle-card.active { border-color: var(--brand); background: #fffaf8; }
    .toggle-card input { accent-color: var(--brand); width: 18px; height: 18px; margin-top: 2px; }
    .toggle-content strong { display: block; font-size: .92rem; }
    .toggle-content span { font-size: .82rem; color: var(--muted); }
    .tokens-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .token-hint { font-size: .82rem; color: var(--muted); font-weight: 600; margin-right: 4px; }
    .token-btn { background: var(--cream); border: 1px solid var(--line); border-radius: 6px; font-size: .8rem; font-weight: 700; padding: 3px 8px; cursor: pointer; color: var(--ink); transition: background .15s; }
    .token-btn:hover { background: var(--brand); color: #fff; border-color: var(--brand); }
    .template-area { font-family: monospace; font-size: .88rem; line-height: 1.5; resize: vertical; }
    .actions-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .test-result-box { padding: 14px 16px; border-radius: 10px; border: 1px solid; }
    .test-result-box.success { background: #f0fdf9; border-color: #a7f3d0; color: #065f46; }
    .test-result-box.error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .test-head { display: flex; align-items: center; gap: 8px; font-size: .92rem; }
    .page-preview { display: flex; align-items: center; gap: 12px; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,.08); }
    .page-pic { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
    .page-title { font-weight: 700; font-size: .92rem; color: var(--ink); }
    .page-sub { font-size: .8rem; color: var(--muted); }
    .page-sub code { font-size: .78rem; background: var(--cream); padding: 2px 4px; border-radius: 4px; }
    .guide-card h3 { margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; }
    .step { display: flex; gap: 12px; margin-bottom: 16px; }
    .step-num { width: 26px; height: 26px; border-radius: 50%; background: var(--brand); color: #fff; font-weight: 800; font-size: .85rem; display: grid; place-items: center; flex-shrink: 0; }
    .step-body strong { font-size: .9rem; display: block; margin-bottom: 2px; }
    .step-body p { margin: 0; font-size: .84rem; color: var(--muted); line-height: 1.4; }
    .step-body ul { margin: 6px 0 0; padding-left: 18px; font-size: .82rem; color: var(--muted); }
    .step-body code { font-size: .78rem; background: var(--cream); padding: 1px 4px; border-radius: 3px; }
    .step-body a { color: var(--brand); text-decoration: underline; }
    .post-mockup { background: #f8fafc; border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
    .mock-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .mock-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: #fff; font-weight: 800; display: grid; place-items: center; font-size: .9rem; }
    .mock-name { font-weight: 700; font-size: .88rem; }
    .mock-time { font-size: .75rem; color: var(--muted); }
    .mock-body { font-size: .84rem; white-space: pre-wrap; line-height: 1.5; color: var(--ink); }
    @media (max-width: 900px) {
      .grid-layout { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminSocialSettingsComponent implements OnInit {
  @Input() embedded = false;
  loading = signal(true);
  saving = signal(false);
  testing = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  testResult = signal<SocialTestResponse | null>(null);
  showToken = false;

  form: SocialSettings = {
    facebookPageId: '',
    facebookPageAccessToken: '',
    facebookAutoPost: false,
    instagramAccountId: '',
    instagramAutoPost: false,
    socialPostTemplate:
      '✨ New Arrival at WonderCart! ✨\n\n🛍️ {product_name}\n💰 Price: Rs {price}\n{discount_text}\n\n👉 Order now: {product_url}\n\n#WonderCart #BabyShop #OnlineShopping',
  };

  constructor(private settingsSvc: SettingsService) {}

  ngOnInit() {
    this.settingsSvc.getSocial().subscribe({
      next: (s) => {
        this.form = {
          facebookPageId: s.facebookPageId || '',
          facebookPageAccessToken: s.facebookPageAccessToken || '',
          facebookAutoPost: Boolean(s.facebookAutoPost),
          instagramAccountId: s.instagramAccountId || '',
          instagramAutoPost: Boolean(s.instagramAutoPost),
          socialPostTemplate: s.socialPostTemplate || this.form.socialPostTemplate,
        };
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  isConfigured(): boolean {
    return Boolean(this.form.facebookPageId && this.form.facebookPageAccessToken);
  }

  insertTag(tag: string) {
    this.form.socialPostTemplate = (this.form.socialPostTemplate || '') + ' ' + tag;
  }

  previewCaption(): string {
    const tpl = this.form.socialPostTemplate || '';
    return tpl
      .replace(/\{product_name\}/g, 'Super Soft Baby Romper')
      .replace(/\{brand\}/g, 'WonderCart')
      .replace(/\{price\}/g, '1,499')
      .replace(/\{compare_at_price\}/g, '1,999')
      .replace(/\{discount_text\}/g, '🔥 Special Offer: 25% OFF (Was Rs 1,999, Save Rs 500)!')
      .replace(/\{product_url\}/g, 'https://wondercart.pk/product/super-soft-baby-romper');
  }

  saveSettings() {
    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.settingsSvc.updateSocial(this.form).subscribe({
      next: () => {
        this.successMessage.set('Facebook & Instagram settings saved successfully!');
        this.saving.set(false);
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to save settings.');
        this.saving.set(false);
      },
    });
  }

  testConnection() {
    this.testing.set(true);
    this.testResult.set(null);
    this.errorMessage.set('');

    this.settingsSvc.testSocial({
      facebookPageId: this.form.facebookPageId,
      facebookPageAccessToken: this.form.facebookPageAccessToken,
      instagramAccountId: this.form.instagramAccountId,
    }).subscribe({
      next: (res) => {
        this.testResult.set(res);
        this.testing.set(false);
      },
      error: (err) => {
        this.testResult.set({
          success: false,
          message: err.error?.message || 'Failed to verify connection with Meta API.',
        });
        this.testing.set(false);
      },
    });
  }
}
