import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SettingsService, ProductService } from '../../../core/services/api.service';
import { SocialSettings, SocialTestResponse, AvailableSocialPage } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';

// Must match a "Valid OAuth Redirect URI" in the Meta app exactly, e.g.
// https://wondercart.pk/admin/accounts?tab=social
const OAUTH_REDIRECT_PATH = '/admin/accounts?tab=social';

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
        
        <!-- Header & Top Status Banner -->
        <div class="head-row">
          <div>
            <div class="title-badge-row">
              <h1>📘 Facebook &amp; Instagram Auto-Posting</h1>
              <span class="workflow-badge">Complete 4-Stage Workflow</span>
            </div>
            <p class="text-muted">Set up one-time connection to automatically publish your store products to your Facebook Page and Instagram feed.</p>
          </div>
          <div class="status-pill" [class.connected]="isConfigured()">
            <span class="dot"></span>
            {{ isConfigured() ? ('Facebook connected: ' + (form.facebookPageName || form.facebookPageId)) : 'Not Connected' }}
            @if (isConfigured()) { <span>✅</span> }
          </div>
        </div>

        <!-- 4-Stage Visual Progress Ribbon -->
        <div class="stages-ribbon mt">
          <div class="stage-step" [class.active]="activeStage === 1" [class.done]="isStage1Done()" (click)="activeStage = 1">
            <span class="st-num">1</span>
            <div class="st-info">
              <strong>STAGE 1</strong>
              <span>Meta App Setup</span>
            </div>
          </div>
          <div class="stage-arrow">&rarr;</div>
          <div class="stage-step" [class.active]="activeStage === 2" [class.done]="isConfigured()" (click)="activeStage = 2">
            <span class="st-num">2</span>
            <div class="st-info">
              <strong>STAGE 2</strong>
              <span>Connect Page</span>
            </div>
          </div>
          <div class="stage-arrow">&rarr;</div>
          <div class="stage-step" [class.active]="activeStage === 3" [class.done]="form.facebookAutoPost" (click)="activeStage = 3">
            <span class="st-num">3</span>
            <div class="st-info">
              <strong>STAGE 3</strong>
              <span>Post / Schedule</span>
            </div>
          </div>
          <div class="stage-arrow">&rarr;</div>
          <div class="stage-step" [class.active]="activeStage === 4" [class.done]="isConfigured()" (click)="activeStage = 4">
            <span class="st-num">4</span>
            <div class="st-info">
              <strong>STAGE 4</strong>
              <span>Keep It Running</span>
            </div>
          </div>
        </div>

        @if (loading()) {
          <div class="spinner"></div>
        } @else {
          <!-- Feedback Alerts -->
          @if (successMessage()) {
            <div class="alert alert-success mt">{{ successMessage() }}</div>
          }
          @if (errorMessage()) {
            <div class="alert alert-error mt">{{ errorMessage() }}</div>
          }

          <div class="grid-layout mt">
            <!-- Left Column: Stage Actions & Config -->
            <div class="left-col">
              
              <!-- STAGE 1: Meta App Keys & Verification -->
              <div class="stage-card card card-pad" [class.active-card]="activeStage === 1">
                <div class="stage-card-head">
                  <span class="stage-tag">STAGE 1</span>
                  <h3>Meta App Setup <span class="badge badge-subtle">(One time, in Meta Dashboard)</span></h3>
                </div>
                <p class="stage-card-desc">
                  Meta App <strong>"AutoPost Pages"</strong> (ID: <code>{{ form.facebookAppId || '970580869378166' }}</code>) is configured in Development mode.
                </p>

                <div class="meta-checklist">
                  <div class="check-item done">
                    <span class="c-icon">✅</span>
                    <div class="c-body">
                      <strong>App ID</strong>
                      <span><code>{{ form.facebookAppId || '970580869378166' }}</code></span>
                    </div>
                  </div>
                  <div class="check-item done">
                    <span class="c-icon">✅</span>
                    <div class="c-body">
                      <strong>App Mode</strong>
                      <span>Development (Direct posting for Page Admins without App Review)</span>
                    </div>
                  </div>
                  <div class="check-item done">
                    <span class="c-icon">✅</span>
                    <div class="c-body">
                      <strong>Permissions / Scopes</strong>
                      <span><code>pages_show_list</code>, <code>pages_manage_posts</code>, <code>pages_read_engagement</code></span>
                    </div>
                  </div>
                  <div class="check-item done">
                    <span class="c-icon">✅</span>
                    <div class="c-body">
                      <strong>Valid OAuth Redirect URIs</strong>
                      <span><code>{{ oauthRedirectUri }}</code></span>
                    </div>
                  </div>
                </div>

                <div class="stage-toggle-btn mt-sm">
                  <button type="button" class="btn-text" (click)="showMetaKeys = !showMetaKeys">
                    {{ showMetaKeys ? '▼ Hide App ID & Secret' : '⚙️ View / Edit Meta App Keys' }}
                  </button>
                </div>

                @if (showMetaKeys) {
                  <div class="keys-box mt-sm">
                    <div class="field">
                      <label>Meta App ID</label>
                      <input class="input" [(ngModel)]="form.facebookAppId" placeholder="970580869378166" />
                    </div>
                    <div class="field mt-xs">
                      <label>Meta App Secret <span class="hint">(For long-lived tokens)</span></label>
                      <input class="input" type="password" [(ngModel)]="form.facebookAppSecret" [placeholder]="appSecretSet ? 'Saved on server — leave blank to keep' : 'Paste App Secret'" />
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm mt-xs" (click)="saveSettings()">Save Keys</button>
                  </div>
                }
              </div>

              <!-- STAGE 2: Connect Your Facebook Page -->
              <div class="stage-card card card-pad mt" [class.active-card]="activeStage === 2">
                <div class="stage-card-head">
                  <span class="stage-tag">STAGE 2</span>
                  <h3>Connect your Facebook Page <span class="badge badge-subtle">(One time)</span></h3>
                </div>
                
                @if (isConfigured()) {
                  <!-- Connected State -->
                  <div class="connected-state-box">
                    <div class="conn-hero">
                      <div class="conn-icon">📘</div>
                      <div class="conn-info">
                        <strong class="conn-title">{{ form.facebookPageName || 'Facebook Page' }}</strong>
                        <span class="conn-sub">Page ID: <code>{{ form.facebookPageId }}</code></span>
                        @if (form.instagramAccountId || form.instagramUsername) {
                          <span class="conn-sub mt-xs">📸 Instagram: <code>{{ form.instagramUsername || form.instagramAccountId }}</code></span>
                        }
                      </div>
                      <span class="badge badge-success">✓ Active &amp; Ready</span>
                    </div>

                    <div class="conn-actions mt">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="openConnectPopup()">
                        🔄 Change Page
                      </button>
                      <button type="button" class="btn btn-ghost btn-sm btn-danger-text" (click)="disconnect()">
                        Disconnect
                      </button>
                    </div>
                  </div>
                } @else {
                  <!-- Connect CTA State -->
                  <div class="connect-prompt">
                    <p>Click <strong>Connect</strong> below to log into Facebook and select the Page where you are an admin.</p>
                    <div class="connect-btns-row">
                      <button type="button" class="btn btn-facebook btn-lg" (click)="openConnectPopup()" [disabled]="connecting()">
                        <span class="fb-icon">f</span>
                        {{ connecting() ? 'Connecting with Facebook…' : 'Connect Facebook Page' }}
                      </button>
                    </div>
                  </div>
                }

                <!-- Manual / Direct Access Token Accordion (Secondary Option) -->
                <div class="mt">
                  <button type="button" class="btn-text" (click)="showManualToken = !showManualToken">
                    {{ showManualToken ? '▼ Hide Manual Token Input' : '🔑 Or paste Access Token directly (Auto-Detect)' }}
                  </button>

                  @if (showManualToken) {
                    <div class="manual-token-card mt-sm">
                      <div class="field">
                        <div class="label-row">
                          <label>Page / User Access Token</label>
                          <button type="button" class="btn-text" (click)="showToken = !showToken">
                            {{ showToken ? '🙈 Hide' : '👁️ Show' }}
                          </button>
                        </div>
                        <input
                          class="input token-input"
                          [type]="showToken ? 'text' : 'password'"
                          [(ngModel)]="form.facebookPageAccessToken"
                          placeholder="EAAB..."
                        />
                        <small class="hint">Paste token from Meta Graph API Explorer or System User.</small>
                      </div>

                      <div class="actions-row mt-sm">
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          (click)="testConnection()"
                          [disabled]="testing() || !form.facebookPageAccessToken"
                        >
                          {{ testing() ? '⏳ Auto-Detecting…' : '⚡ Auto-Detect & Connect' }}
                        </button>
                      </div>
                    </div>
                  }
                </div>

                <!-- Multiple Pages Selection Box (when multiple pages are returned) -->
                @if (availablePages().length > 0) {
                  <div class="multi-pages-box mt">
                    <div class="multi-pages-title">
                      <span>📑 Choose a Facebook Page ({{ availablePages().length }} Found):</span>
                    </div>
                    <div class="pages-list">
                      @for (p of availablePages(); track p.id) {
                        <div
                          class="page-option"
                          [class.selected]="form.facebookPageId === p.id"
                          (click)="selectPage(p)"
                        >
                          <div class="page-meta-row">
                            @if (p.pictureUrl) {
                              <img [src]="p.pictureUrl" alt="Page Avatar" class="page-option-pic" />
                            } @else {
                              <span class="page-default-avatar">📘</span>
                            }
                            <div class="page-option-text">
                              <strong class="page-option-name">{{ p.name }}</strong>
                              <span class="page-option-id">ID: <code>{{ p.id }}</code></span>
                              @if (p.instagram?.username || p.instagram?.id) {
                                <span class="page-ig-badge">📸 {{ p.instagram?.username || 'Linked Instagram' }}</span>
                              }
                            </div>
                          </div>
                          @if (form.facebookPageId === p.id) {
                            <span class="badge badge-success">✓ Connected</span>
                          } @else {
                            <button type="button" class="btn btn-primary btn-xs" (click)="selectPage(p)">Connect</button>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- STAGE 3: Auto-Posting & Template Preferences -->
              <div class="stage-card card card-pad mt" [class.active-card]="activeStage === 3">
                <div class="stage-card-head">
                  <span class="stage-tag">STAGE 3</span>
                  <h3>Auto-Posting &amp; Publishing Preferences <span class="badge badge-subtle">(Automatic)</span></h3>
                </div>

                <div class="toggles-list mt-sm">
                  <label class="toggle-card" [class.active]="form.facebookAutoPost">
                    <input type="checkbox" [(ngModel)]="form.facebookAutoPost" name="facebookAutoPost" />
                    <div class="toggle-content">
                      <strong>✅ Auto-post new products to Facebook Page</strong>
                      <span>When saving or adding products in Store Admin, automatically publish photos, price, and shop link.</span>
                    </div>
                  </label>

                  <label class="toggle-card" [class.active]="form.instagramAutoPost">
                    <input type="checkbox" [(ngModel)]="form.instagramAutoPost" name="instagramAutoPost" />
                    <div class="toggle-content">
                      <strong>📸 Auto-post to Instagram Feed</strong>
                      <span>Automatically publish image and caption to linked Instagram business account.</span>
                    </div>
                  </label>
                </div>

                <!-- Post Caption Template -->
                <div class="field mt">
                  <label><strong>Post Caption Template</strong></label>
                  <div class="tokens-bar mt-xs">
                    <span class="token-hint">Click to add:</span>
                    <button type="button" class="token-btn" (click)="insertTag('{product_name}')">+ Name</button>
                    <button type="button" class="token-btn" (click)="insertTag('{description}')">+ Description</button>
                    <button type="button" class="token-btn" (click)="insertTag('{price}')">+ Price</button>
                    <button type="button" class="token-btn" (click)="insertTag('{discount_text}')">+ Discount</button>
                    <button type="button" class="token-btn" (click)="insertTag('{product_url}')">+ Product Link</button>
                    <button type="button" class="token-btn" (click)="insertTag('{buy_now_url}')">+ Buy Now Link</button>
                    <button type="button" class="token-btn" (click)="insertTag('{brand}')">+ Brand</button>
                  </div>
                  <textarea
                    class="input template-area mt-xs"
                    rows="5"
                    [(ngModel)]="form.socialPostTemplate"
                    name="socialPostTemplate"
                    placeholder="✨ New Arrival at WonderCart! ✨&#10;&#10;🛍️ {product_name}&#10;💰 Price: Rs {price}&#10;{discount_text}&#10;&#10;👉 Order now: {product_url}"
                  ></textarea>
                </div>

                <!-- Website Footer Links -->
                <div class="grid grid-2 mt-sm">
                  <div class="field">
                    <label>Public Facebook Page URL</label>
                    <input class="input" type="url" [(ngModel)]="form.facebookUrl" placeholder="https://facebook.com/your-page" />
                  </div>
                  <div class="field">
                    <label>Public Instagram URL</label>
                    <input class="input" type="url" [(ngModel)]="form.instagramUrl" placeholder="https://instagram.com/your-profile" />
                  </div>
                </div>

                <div class="actions-row mt">
                  <button type="button" class="btn btn-primary" (click)="saveSettings()" [disabled]="saving()">
                    {{ saving() ? 'Saving…' : '💾 Save Settings' }}
                  </button>
                </div>
              </div>

              <!-- STAGE 4: Keep It Running / Health Status -->
              <div class="stage-card card card-pad mt" [class.active-card]="activeStage === 4">
                <div class="stage-card-head">
                  <span class="stage-tag">STAGE 4</span>
                  <h3>Keep It Running <span class="badge badge-subtle">(Always active)</span></h3>
                </div>
                <div class="running-status-box mt-sm">
                  <div class="status-grid">
                    <div class="stat-cell">
                      <span class="stat-lbl">Page Connection</span>
                      <strong class="stat-val text-success">{{ isConfigured() ? 'Never Expires (Permanent)' : 'Not Connected' }}</strong>
                    </div>
                    <div class="stat-cell">
                      <span class="stat-lbl">Auto-Post Engine</span>
                      <strong class="stat-val text-success">{{ form.facebookAutoPost ? '🟢 Enabled' : '⚪ Paused' }}</strong>
                    </div>
                  </div>
                  <p class="mt-sm text-sm text-muted">
                    Your Page credentials and access tokens are safely stored in your database. You only need to reconnect if you change your Facebook account password or remove app access in Facebook Business Integrations.
                  </p>
                </div>
              </div>

            </div>

            <!-- Right Column: Live Preview & Quick Test Tool -->
            <div class="side-col">
              
              <!-- Post Preview Mockup Card -->
              <div class="card card-pad preview-card">
                <h4>✨ Live Social Post Preview</h4>
                <div class="post-mockup mt-sm">
                  <div class="mock-header">
                    <div class="mock-avatar">📘</div>
                    <div>
                      <div class="mock-name">{{ form.facebookPageName || 'WonderCart Official' }}</div>
                      <div class="mock-time">Just now · 🌍 Public</div>
                    </div>
                  </div>
                  <div class="mock-body">{{ previewCaption() }}</div>
                  <div class="mock-btn-cta">
                    <span>🛍️ Shop Now</span>
                  </div>
                </div>
              </div>

              <!-- Quick Test Share Tool -->
              <div class="card card-pad mt">
                <h4>⚡ Test Live Facebook Post</h4>
                <p class="text-sm text-muted">Send an instant test post to your connected Page to verify live publishing permissions.</p>

                @if (testPublishMsg()) {
                  <div class="alert alert-success mt-xs text-sm">{{ testPublishMsg() }}</div>
                }
                @if (testPublishErr()) {
                  <div class="alert alert-error mt-xs text-sm">{{ testPublishErr() }}</div>
                }

                <div class="field mt-sm">
                  <input class="input" [(ngModel)]="testPostMessage" placeholder="Custom test caption (optional)" />
                </div>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm mt-xs w-full"
                  (click)="sendTestPost()"
                  [disabled]="!isConfigured() || testPublishing()"
                >
                  {{ testPublishing() ? '⏳ Publishing to Facebook…' : '🚀 Publish Test Post to Page' }}
                </button>
              </div>

              <!-- Live Facebook Page Feed (Direct from Facebook) -->
              <div class="card card-pad mt live-feed-card">
                <div class="feed-head">
                  <div>
                    <h4>📢 Live Posts on Facebook Page</h4>
                    <span class="text-sm text-muted">{{ isConfigured() ? (recentPosts().length + ' posts loaded') : 'Connect page to view posts' }}</span>
                  </div>
                  <div class="feed-head-actions">
                    <button type="button" class="btn btn-ghost btn-xs" (click)="loadRecentPosts()" [disabled]="loadingPosts() || !isConfigured()" title="Refresh posts from Facebook">
                      {{ loadingPosts() ? '🔄 Loading…' : '🔄 Refresh' }}
                    </button>
                    @if (pageUrl() || form.facebookPageId) {
                      <a [href]="pageUrl() || ('https://facebook.com/' + form.facebookPageId)" target="_blank" rel="noopener noreferrer" class="btn btn-facebook btn-xs" title="Open Facebook Page in new tab">
                        🔗 Open Page ↗
                      </a>
                    }
                  </div>
                </div>

                @if (postsError()) {
                  <div class="alert alert-error mt-xs text-sm">{{ postsError() }}</div>
                }

                @if (loadingPosts()) {
                  <div class="posts-spinner mt-sm">
                    <div class="spinner"></div>
                    <span class="text-sm text-muted">Loading live posts from Facebook Page…</span>
                  </div>
                } @else if (recentPosts().length === 0) {
                  <p class="text-sm text-muted mt-sm">No recent posts found or page not connected yet.</p>
                } @else {
                  <div class="posts-feed-list mt-sm">
                    @for (post of recentPosts(); track post.id) {
                      <div class="live-post-item">
                        @if (post.fullPicture) {
                          <div class="post-thumb-wrap">
                            <img [src]="post.fullPicture" alt="Post thumbnail" class="post-thumb" />
                          </div>
                        }
                        <div class="post-details">
                          <p class="post-msg">{{ post.message ? (post.message.length > 140 ? (post.message | slice:0:140) + '…' : post.message) : '(Photo/Video post)' }}</p>
                          <div class="post-meta-row">
                            <span class="post-time">🕒 {{ post.createdTime | date:'short' }}</span>
                            <a [href]="post.permalinkUrl" target="_blank" rel="noopener noreferrer" class="post-link-btn">
                              👁️ View on Facebook ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Troubleshooting Quick Guide -->
              <div class="card card-pad mt trouble-card">
                <h4>💡 Quick Troubleshooting</h4>
                <ul class="trouble-list">
                  <li>
                    <strong>"Can't load URL"</strong>: Check that <code>localhost</code> is in App Domains.
                  </li>
                  <li>
                    <strong>"Invalid Scopes"</strong>: Ensure <code>pages_manage_posts</code> is enabled in Meta App Use Cases.
                  </li>
                  <li>
                    <strong>"No Page was shared"</strong>: When logging in, click <em>Edit access</em> and check your Page.
                  </li>
                </ul>
              </div>

            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .head-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .title-badge-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .title-badge-row h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
    .workflow-badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 999px; font-size: .78rem; font-weight: 800; border: 1px solid #bae6fd; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: .88rem; padding: 6px 14px; border-radius: 999px; background: #fff1e8; color: #d05c26; border: 1px solid #fed7c3; }
    .status-pill.connected { background: #e6f7f2; color: #1f6b60; border-color: #a3e6d8; }
    .status-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    
    /* Stages Ribbon */
    .stages-ribbon { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 18px; gap: 10px; flex-wrap: wrap; }
    .stage-step { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 10px; border-radius: 8px; transition: all .15s ease; }
    .stage-step:hover { background: #f8fafc; }
    .stage-step.active { background: #eff6ff; }
    .stage-step.done .st-num { background: #10b981; color: #fff; }
    .st-num { width: 28px; height: 28px; border-radius: 50%; background: var(--line); color: var(--ink); font-weight: 800; font-size: .84rem; display: grid; place-items: center; }
    .st-info { display: flex; flex-direction: column; }
    .st-info strong { font-size: .78rem; color: var(--muted); }
    .st-info span { font-size: .88rem; font-weight: 700; color: var(--ink); }
    .stage-arrow { color: var(--muted); font-weight: 800; }

    .grid-layout { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; }
    .stage-card { border-left: 4px solid transparent; transition: border-color .2s; }
    .stage-card.active-card { border-left-color: var(--brand); }
    .stage-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .stage-tag { background: var(--brand); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: .75rem; font-weight: 800; }
    .stage-card-head h3 { margin: 0; font-size: 1.15rem; }
    .badge-subtle { background: #f1f5f9; color: var(--muted); font-size: .78rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .stage-card-desc { font-size: .88rem; color: var(--muted); margin: 0 0 14px; }
    
    /* Checklist */
    .meta-checklist { display: flex; flex-direction: column; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid var(--line); }
    .check-item { display: flex; align-items: flex-start; gap: 10px; font-size: .85rem; }
    .check-item code { background: #fff; border: 1px solid var(--line); padding: 1px 5px; border-radius: 4px; font-size: .8rem; }
    .c-body strong { display: inline-block; width: 150px; color: var(--ink); }
    .c-body span { color: var(--muted); }

    .keys-box { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
    .connected-state-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px 16px; }
    .conn-hero { display: flex; align-items: center; gap: 12px; justify-content: space-between; flex-wrap: wrap; }
    .conn-icon { font-size: 2rem; }
    .conn-info { display: flex; flex-direction: column; }
    .conn-title { font-size: 1.05rem; color: #14532d; }
    .conn-sub { font-size: .82rem; color: #15803d; }
    .conn-sub code { background: #dcfce7; padding: 1px 5px; border-radius: 4px; font-size: .8rem; }
    .conn-actions { display: flex; gap: 10px; }
    .btn-danger-text { color: #dc2626 !important; }

    /* Connect Button */
    .connect-prompt { background: #f8fafc; border: 1.5px dashed var(--line); border-radius: 10px; padding: 20px; text-align: center; }
    .connect-prompt p { margin: 0 0 14px; font-size: .9rem; color: var(--muted); }
    .btn-facebook { background: #1877f2; color: #fff; border: none; font-weight: 700; font-size: 1rem; padding: 10px 24px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: background .15s; }
    .btn-facebook:hover { background: #166fe5; }
    .fb-icon { background: #fff; color: #1877f2; font-weight: 900; font-size: 1.1rem; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; line-height: 1; }

    .manual-token-card { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
    .token-input { font-family: monospace; font-size: .84rem; }
    .btn-text { background: none; border: none; font-weight: 700; font-size: .84rem; color: var(--brand); cursor: pointer; padding: 0; }

    /* Pages Picker */
    .multi-pages-box { background: #f8fafc; border: 1.5px solid var(--line); border-radius: 8px; padding: 12px; }
    .multi-pages-title { font-weight: 700; font-size: .88rem; margin-bottom: 8px; color: var(--ink); }
    .pages-list { display: flex; flex-direction: column; gap: 6px; }
    .page-option { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; background: #fff; cursor: pointer; transition: all .15s; }
    .page-option:hover { border-color: var(--brand); background: #fffaf8; }
    .page-option.selected { border-color: var(--brand); background: #fff3ec; }
    .page-meta-row { display: flex; align-items: center; gap: 10px; }
    .page-option-pic { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .page-default-avatar { font-size: 1.5rem; }
    .page-option-text { display: flex; flex-direction: column; }
    .page-option-name { font-size: .9rem; color: var(--ink); }
    .page-option-id { font-size: .78rem; color: var(--muted); }
    .page-ig-badge { font-size: .75rem; color: #c026d3; font-weight: 600; }

    /* Toggles & Template */
    .toggles-list { display: flex; flex-direction: column; gap: 10px; }
    .toggle-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1.5px solid var(--line); border-radius: 8px; background: #fff; cursor: pointer; transition: all .15s ease; }
    .toggle-card.active { border-color: var(--brand); background: #fffaf8; }
    .toggle-card input { accent-color: var(--brand); width: 18px; height: 18px; margin-top: 2px; }
    .toggle-content strong { display: block; font-size: .92rem; }
    .toggle-content span { font-size: .82rem; color: var(--muted); }

    .tokens-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
    .token-hint { font-size: .82rem; color: var(--muted); font-weight: 600; }
    .token-btn { background: var(--cream); border: 1px solid var(--line); border-radius: 6px; font-size: .8rem; font-weight: 700; padding: 3px 8px; cursor: pointer; color: var(--ink); }
    .token-btn:hover { background: var(--brand); color: #fff; border-color: var(--brand); }
    .template-area { font-family: monospace; font-size: .86rem; line-height: 1.5; resize: vertical; }

    /* Stage 4 Running Box */
    .running-status-box { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-cell { display: flex; flex-direction: column; }
    .stat-lbl { font-size: .78rem; color: var(--muted); }
    .stat-val { font-size: .92rem; }

    /* Post Mockup */
    .post-mockup { background: #f8fafc; border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
    .mock-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .mock-avatar { width: 36px; height: 36px; border-radius: 50%; background: #1877f2; color: #fff; font-weight: 800; display: grid; place-items: center; font-size: 1.2rem; }
    .mock-name { font-weight: 700; font-size: .88rem; }
    .mock-time { font-size: .75rem; color: var(--muted); }
    .mock-body { font-size: .84rem; white-space: pre-wrap; line-height: 1.5; color: var(--ink); }
    .mock-btn-cta { margin-top: 10px; padding: 6px 12px; background: #e2e8f0; border-radius: 6px; display: inline-block; font-size: .8rem; font-weight: 700; color: var(--ink); }

    .trouble-card h4 { margin: 0 0 10px; font-size: .95rem; }
    .trouble-list { margin: 0; padding-left: 18px; font-size: .82rem; color: var(--muted); line-height: 1.5; }
    .trouble-list strong { color: var(--ink); }

    /* Live Feed Styles */
    .live-feed-card { border-top: 3px solid #1877f2; }
    .feed-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .feed-head h4 { margin: 0; font-size: .95rem; font-weight: 800; }
    .feed-head-actions { display: flex; gap: 6px; align-items: center; }
    .btn-xs { padding: 3px 8px; font-size: .75rem; border-radius: 6px; }
    .posts-spinner { display: flex; align-items: center; gap: 10px; padding: 14px 0; }
    .posts-feed-list { display: flex; flex-direction: column; gap: 10px; max-height: 480px; overflow-y: auto; }
    .live-post-item { display: flex; gap: 10px; padding: 10px; background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; align-items: flex-start; }
    .post-thumb-wrap { width: 56px; height: 56px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #e2e8f0; }
    .post-thumb { width: 100%; height: 100%; object-fit: cover; }
    .post-details { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .post-msg { margin: 0; font-size: .8rem; line-height: 1.4; color: var(--ink); white-space: pre-wrap; word-break: break-word; }
    .post-meta-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: .72rem; color: var(--muted); margin-top: 4px; flex-wrap: wrap; }
    .post-link-btn { color: #1877f2; font-weight: 700; text-decoration: none; }
    .post-link-btn:hover { text-decoration: underline; }

    @media (max-width: 900px) {
      .grid-layout { grid-template-columns: 1fr; }
      .stages-ribbon { flex-direction: column; align-items: stretch; }
      .stage-arrow { display: none; }
    }
  `],
})
export class AdminSocialSettingsComponent implements OnInit {
  readonly oauthRedirectUri = window.location.origin + OAUTH_REDIRECT_PATH;
  appSecretSet = false;

  @Input() embedded = false;
  loading = signal(true);
  saving = signal(false);
  testing = signal(false);
  connecting = signal(false);
  testPublishing = signal(false);

  successMessage = signal('');
  errorMessage = signal('');
  testPublishMsg = signal('');
  testPublishErr = signal('');
  testResult = signal<SocialTestResponse | null>(null);
  availablePages = signal<AvailableSocialPage[]>([]);

  /** Live Feed signals */
  recentPosts = signal<any[]>([]);
  loadingPosts = signal(false);
  postsError = signal('');
  pageUrl = signal('');

  activeStage = 2;
  showMetaKeys = false;
  showManualToken = false;
  showToken = false;
  testPostMessage = '';

  form: SocialSettings = {
    facebookUrl: '',
    instagramUrl: '',
    facebookAppId: '970580869378166',
    facebookAppSecret: '',
    facebookPageId: '',
    facebookPageName: '',
    facebookPageAccessToken: '',
    facebookAutoPost: true,
    instagramAccountId: '',
    instagramUsername: '',
    instagramAutoPost: false,
    socialPostTemplate:
      '✨ New Arrival at WonderCart! ✨\n\n🛍️ {product_name}\n💰 Price: Rs {price}\n{discount_text}\n\n👉 Order now: {product_url}\n\n#WonderCart #BabyShop #OnlineShopping',
  };

  constructor(
    private settingsSvc: SettingsService,
    private productSvc: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSettings();

    // Check if redirect returned with code or error
    this.route.queryParams.subscribe((params) => {
      if (params['code']) {
        this.handleOAuthCallback(params['code']);
        // The code is single-use; drop it from the address bar so a refresh doesn't resubmit it.
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { code: null, state: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      } else if (params['error_description'] || params['error_message']) {
        this.errorMessage.set(params['error_description'] || params['error_message'] || 'Facebook login was cancelled or failed.');
      }
    });
  }

  loadSettings() {
    this.settingsSvc.getSocial().subscribe({
      next: (s) => {
        this.appSecretSet = Boolean(s.facebookAppSecretSet);
        this.form = {
          facebookUrl: s.facebookUrl || '',
          instagramUrl: s.instagramUrl || '',
          facebookAppId: s.facebookAppId || '970580869378166',
          facebookAppSecret: '',
          facebookPageId: s.facebookPageId || '',
          facebookPageName: s.facebookPageName || '',
          facebookPageAccessToken: s.facebookPageAccessToken || '',
          facebookAutoPost: s.facebookAutoPost !== false,
          instagramAccountId: s.instagramAccountId || '',
          instagramUsername: s.instagramUsername || '',
          instagramAutoPost: Boolean(s.instagramAutoPost),
          socialPostTemplate: s.socialPostTemplate || this.form.socialPostTemplate,
        };
        this.loading.set(false);
        if (this.isConfigured()) {
          this.loadRecentPosts();
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadRecentPosts() {
    if (!this.isConfigured()) return;
    this.loadingPosts.set(true);
    this.postsError.set('');
    this.settingsSvc.getRecentSocialPosts(10).subscribe({
      next: (res) => {
        this.recentPosts.set(res.posts || []);
        if (res.pageUrl) this.pageUrl.set(res.pageUrl);
        this.loadingPosts.set(false);
      },
      error: (err) => {
        this.postsError.set(err.error?.message || 'Could not load recent Facebook posts.');
        this.loadingPosts.set(false);
      },
    });
  }

  isConfigured(): boolean {
    return Boolean(this.form.facebookPageId && this.form.facebookPageAccessToken);
  }

  isStage1Done(): boolean {
    return Boolean(this.form.facebookAppId);
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
      .replace(/\{product_url\}/g, 'https://wondercart.pk/product/super-soft-baby-romper')
      .replace(/\{buy_now_url\}/g, 'https://wondercart.pk/product/super-soft-baby-romper?buy=true');
  }

  /**
   * 1-Click Connect Button via Facebook OAuth
   */
  openConnectPopup() {
    this.connecting.set(true);
    this.errorMessage.set('');

    const redirectUri = this.oauthRedirectUri;
    this.settingsSvc.getSocialOAuthUrl(redirectUri).subscribe({
      next: (res) => {
        this.connecting.set(false);
        if (res.url) {
          // Redirect to Facebook OAuth Dialog
          window.location.href = res.url;
        }
      },
      error: (err) => {
        this.connecting.set(false);
        this.errorMessage.set(err.error?.message || 'Could not initiate Facebook login.');
      },
    });
  }

  handleOAuthCallback(code: string) {
    this.connecting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const redirectUri = this.oauthRedirectUri;
    this.settingsSvc.exchangeSocialToken(code, redirectUri).subscribe({
      next: (res) => {
        this.connecting.set(false);
        if (res.availablePages && res.availablePages.length > 0) {
          this.availablePages.set(res.availablePages);

          // If exactly 1 page found, auto select it
          if (res.availablePages.length === 1) {
            this.selectPage(res.availablePages[0]);
          } else {
            this.successMessage.set(`Found ${res.availablePages.length} Facebook Pages! Please choose your Page below.`);
          }
        } else if (res.selectedPage) {
          this.selectPage(res.selectedPage);
        }
      },
      error: (err) => {
        this.connecting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to complete Facebook authentication.');
      },
    });
  }

  selectPage(page: AvailableSocialPage) {
    this.settingsSvc.selectSocialPage({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.pageAccessToken || this.form.facebookPageAccessToken,
      instagramAccountId: page.instagram?.id,
      instagramUsername: page.instagram?.username || page.instagram?.name,
    }).subscribe({
      next: (res) => {
        this.form.facebookPageId = page.id;
        this.form.facebookPageName = page.name;
        if (page.pageAccessToken) this.form.facebookPageAccessToken = page.pageAccessToken;
        if (page.instagram?.id) this.form.instagramAccountId = page.instagram.id;
        if (page.instagram?.username) this.form.instagramUsername = page.instagram.username;
        this.form.facebookAutoPost = true;

        this.successMessage.set(res.message || `Facebook connected: ${page.name} ✅`);
        this.activeStage = 3;
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to link Facebook Page.');
      },
    });
  }

  disconnect() {
    if (!confirm('Disconnect Facebook & Instagram from auto-posting?')) return;
    this.settingsSvc.disconnectSocial().subscribe({
      next: () => {
        this.form.facebookPageId = '';
        this.form.facebookPageName = '';
        this.form.facebookPageAccessToken = '';
        this.form.facebookAutoPost = false;
        this.form.instagramAccountId = '';
        this.form.instagramUsername = '';
        this.availablePages.set([]);
        this.successMessage.set('Facebook disconnected.');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to disconnect.');
      },
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.settingsSvc.updateSocial(this.form).subscribe({
      next: (updated) => {
        if (updated.facebookPageId) this.form.facebookPageId = updated.facebookPageId;
        if (updated.facebookPageName) this.form.facebookPageName = updated.facebookPageName;
        if (updated.instagramAccountId) this.form.instagramAccountId = updated.instagramAccountId;
        this.successMessage.set('Social settings saved successfully!');
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
    if (!this.form.facebookPageAccessToken) {
      this.errorMessage.set('Please enter your Access Token first.');
      return;
    }

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
        if (res.availablePages && res.availablePages.length > 0) {
          this.availablePages.set(res.availablePages);
        }
        if (res.resolvedPageId) {
          this.form.facebookPageId = res.resolvedPageId;
        }
        if (res.page?.name) {
          this.form.facebookPageName = res.page.name;
        }
        if (res.resolvedPageToken) {
          this.form.facebookPageAccessToken = res.resolvedPageToken;
        }
        if (res.resolvedInstagramId) {
          this.form.instagramAccountId = res.resolvedInstagramId;
        }
        this.testing.set(false);
        this.successMessage.set(res.message || 'Connected successfully!');
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

  sendTestPost() {
    this.testPublishing.set(true);
    this.testPublishMsg.set('');
    this.testPublishErr.set('');

    this.productSvc.list({ limit: 1 }).subscribe({
      next: (res) => {
        const prod = res.items?.[0];
        if (!prod) {
          this.testPublishErr.set('No products found in catalogue to use for test post.');
          this.testPublishing.set(false);
          return;
        }

        this.productSvc.shareSocial(prod._id || (prod as any).id, {
          postToFacebook: true,
          postToInstagram: false,
          customMessage: this.testPostMessage.trim() || undefined,
          includeShopNowButton: true,
        }).subscribe({
          next: (shareRes) => {
            this.testPublishing.set(false);
            this.testPublishMsg.set(shareRes.message || 'Test post published to Facebook successfully! 🎉');
            this.loadRecentPosts();
            setTimeout(() => this.testPublishMsg.set(''), 6000);
          },
          error: (err) => {
            this.testPublishing.set(false);
            this.testPublishErr.set(err.error?.message || 'Failed to post on Facebook.');
          },
        });
      },
      error: (err) => {
        this.testPublishing.set(false);
        this.testPublishErr.set(err.error?.message || 'Failed to fetch sample product.');
      },
    });
  }
}
