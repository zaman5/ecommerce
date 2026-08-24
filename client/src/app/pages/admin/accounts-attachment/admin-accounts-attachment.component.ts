import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminNavComponent } from '../admin-nav.component';
import { AdminJazzcashSettingsComponent } from '../jazzcash-settings/admin-jazzcash-settings.component';
import { AdminSocialSettingsComponent } from '../social-settings/admin-social-settings.component';
import { AdminEmailsComponent } from '../emails/admin-emails.component';
import { SettingsService, EmailTemplateService } from '../../../core/services/api.service';

type AccountTab = 'jazzcash' | 'social' | 'emails';

@Component({
  selector: 'app-admin-accounts-attachment',
  standalone: true,
  imports: [
    CommonModule,
    AdminNavComponent,
    AdminJazzcashSettingsComponent,
    AdminSocialSettingsComponent,
    AdminEmailsComponent,
  ],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />

        <!-- Header -->
        <div class="hub-head">
          <div>
            <h1>🔗 Accounts Attachment</h1>
            <p class="text-muted">
              Centralized hub to manage your payment accounts, social media platforms, and automated email services.
            </p>
          </div>
        </div>

        <!-- Quick Summary Cards -->
        <div class="summary-cards mt">
          <!-- JazzCash Card -->
          <div class="sum-card" [class.active]="activeTab() === 'jazzcash'" (click)="setTab('jazzcash')">
            <div class="sum-icon-wrap jc-icon">📱</div>
            <div class="sum-info">
              <div class="sum-title">JazzCash Payment</div>
              <div class="sum-status">
                @if (jazzcashPhone()) {
                  <span class="badge badge-success">✓ {{ jazzcashPhone() }}</span>
                } @else {
                  <span class="badge badge-warning">Not Set</span>
                }
              </div>
            </div>
            <div class="sum-arrow">&rarr;</div>
          </div>

          <!-- Social Media Card -->
          <div class="sum-card" [class.active]="activeTab() === 'social'" (click)="setTab('social')">
            <div class="sum-icon-wrap soc-icon">📘</div>
            <div class="sum-info">
              <div class="sum-title">Facebook & Instagram</div>
              <div class="sum-status">
                @if (socialConnected()) {
                  <span class="badge badge-success">✓ Meta Connected</span>
                } @else {
                  <span class="badge badge-warning">Not Configured</span>
                }
              </div>
            </div>
            <div class="sum-arrow">&rarr;</div>
          </div>

          <!-- Emails Card -->
          <div class="sum-card" [class.active]="activeTab() === 'emails'" (click)="setTab('emails')">
            <div class="sum-icon-wrap mail-icon">📧</div>
            <div class="sum-info">
              <div class="sum-title">Email Templates</div>
              <div class="sum-status">
                <span class="badge badge-info">3 Auto-Notifications</span>
              </div>
            </div>
            <div class="sum-arrow">&rarr;</div>
          </div>
        </div>

        <!-- Main Switcher Bar -->
        <div class="tab-switcher mt-lg">
          <button
            type="button"
            class="switch-btn"
            [class.active]="activeTab() === 'jazzcash'"
            (click)="setTab('jazzcash')"
          >
            <span class="btn-icon">📱</span>
            <span>JazzCash Settings</span>
          </button>

          <button
            type="button"
            class="switch-btn"
            [class.active]="activeTab() === 'social'"
            (click)="setTab('social')"
          >
            <span class="btn-icon">📘</span>
            <span>Facebook & Instagram</span>
          </button>

          <button
            type="button"
            class="switch-btn"
            [class.active]="activeTab() === 'emails'"
            (click)="setTab('emails')"
          >
            <span class="btn-icon">📧</span>
            <span>Email Designer</span>
          </button>
        </div>

        <!-- Tab Content Views -->
        <div class="tab-content-area mt">
          @if (activeTab() === 'jazzcash') {
            <app-admin-jazzcash-settings [embedded]="true" />
          }
          @if (activeTab() === 'social') {
            <app-admin-social-settings [embedded]="true" />
          }
          @if (activeTab() === 'emails') {
            <app-admin-emails [embedded]="true" />
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hub-head { margin-bottom: 20px; }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .sum-card { 
      display: flex; align-items: center; gap: 14px; background: #fff; border: 1.5px solid var(--line); 
      border-radius: var(--radius-sm); padding: 16px 20px; cursor: pointer; transition: all .2s ease;
      box-shadow: var(--shadow-sm);
    }
    .sum-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .sum-card.active { border-color: var(--brand); background: #fffbf9; border-width: 2px; }
    .sum-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 1.3rem; flex-shrink: 0; }
    .jc-icon { background: #fdf2f8; color: #db2777; }
    .soc-icon { background: #eff6ff; color: #2563eb; }
    .mail-icon { background: #f0fdf4; color: #16a34a; }
    .sum-info { flex: 1; min-width: 0; }
    .sum-title { font-weight: 700; font-size: .95rem; color: var(--ink); margin-bottom: 4px; }
    .sum-status { font-size: .8rem; }
    .sum-arrow { font-size: 1.1rem; color: var(--muted); transition: transform .2s; }
    .sum-card:hover .sum-arrow { color: var(--brand); transform: translateX(3px); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: .75rem; }
    .badge-success { background: #e6f7f2; color: #0f766e; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-info { background: #f0fdf4; color: #15803d; }
    
    .tab-switcher { 
      display: flex; gap: 10px; background: #fff; padding: 8px; border-radius: 14px; 
      border: 1px solid var(--line); box-shadow: var(--shadow-sm); width: fit-content; max-width: 100%;
      overflow-x: auto; scrollbar-width: none;
    }
    .tab-switcher::-webkit-scrollbar { display: none; }
    .switch-btn { 
      display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; 
      border: none; background: none; font-weight: 700; font-size: .92rem; color: var(--muted); 
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .switch-btn:hover:not(.active) { background: var(--cream); color: var(--ink); }
    .switch-btn.active { background: var(--ink); color: #fff; box-shadow: var(--shadow-sm); }
    .tab-content-area { animation: fadeIn .2s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 768px) {
      .tab-switcher { width: 100%; border-radius: 12px; }
      .switch-btn { padding: 8px 14px; font-size: .85rem; }
    }
  `],
})
export class AdminAccountsAttachmentComponent implements OnInit {
  activeTab = signal<AccountTab>('jazzcash');

  jazzcashPhone = signal('');
  socialConnected = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settingsSvc: SettingsService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'] as AccountTab;
      if (tab && ['jazzcash', 'social', 'emails'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });

    this.settingsSvc.getJazzCash().subscribe({
      next: (jc) => this.jazzcashPhone.set(jc.phone || ''),
      error: () => {},
    });

    this.settingsSvc.getSocial().subscribe({
      next: (soc) => this.socialConnected.set(Boolean(soc.facebookPageId && soc.facebookPageAccessToken)),
      error: () => {},
    });
  }

  setTab(tab: AccountTab) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }
}
