import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <div class="badge-pill">Legal &amp; Privacy</div>
          <h1>🔒 Privacy Policy</h1>
          <p class="intro">
            At <strong>WonderCart</strong>, we are committed to protecting your privacy and safeguarding your personal information.
          </p>
        </div>

        <div class="policy-layout">
          <!-- Main Privacy Content -->
          <article class="card card-pad policy-card">
            <!-- Data Protection -->
            <section class="policy-block">
              <div class="block-header">
                <span class="block-ico">🛡️</span>
                <h2>Data Protection</h2>
              </div>
              <ul class="policy-list">
                <li>We do not sell or rent customer data to third parties without explicit consent.</li>
                <li>Data is stored securely using physical and digital safeguards to prevent unauthorized access.</li>
              </ul>
            </section>

            <!-- Use of Information -->
            <section class="policy-block">
              <div class="block-header">
                <span class="block-ico">📋</span>
                <h2>Use of Information</h2>
              </div>
              <ul class="policy-list">
                <li>Customer data is used solely for order processing, service improvement, and direct communication regarding your orders.</li>
                <li>Customers may update or modify their information at any time through their personal account settings.</li>
              </ul>
            </section>

            <!-- Authorized Access -->
            <section class="policy-block">
              <div class="block-header">
                <span class="block-ico">🔑</span>
                <h2>Authorized Access</h2>
              </div>
              <p>
                Only authorized personnel may access limited customer data strictly for operational, fulfillment, and customer support purposes.
              </p>
            </section>

            <!-- Security Assurance -->
            <section class="policy-block">
              <div class="block-header">
                <span class="block-ico">🔐</span>
                <h2>Security Assurance</h2>
              </div>
              <p>
                WonderCart employs continuous monitoring, SSL/TLS encryption, and proactive security protocols to protect systems against unauthorized access or misuse.
              </p>
            </section>
          </article>

          <!-- Sidebar -->
          <aside class="sidebar-col">
            <div class="card card-pad side-box">
              <h3>Have Privacy Questions?</h3>
              <p>If you have any questions regarding your data or our privacy practices, our team is happy to help.</p>

              <div class="contact-line">
                <span class="ico">✉️</span>
                <div>
                  <strong>Email</strong>
                  <a href="mailto:support@wondercart.pk">support&#64;wondercart.pk</a>
                </div>
              </div>

              <div class="side-actions">
                <a routerLink="/contact" class="btn btn-primary btn-block">Contact Us</a>
                <a routerLink="/terms" class="btn btn-ghost btn-block">Terms &amp; Conditions</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .badge-pill { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand); background: rgba(59, 130, 246, 0.1); padding: 4px 12px; border-radius: 999px; margin-bottom: 10px; }
    .head { margin-bottom: 32px; }
    .head h1 { margin: 0 0 8px; font-size: 2rem; color: var(--ink); }
    .head .intro { max-width: 72ch; margin: 0; font-size: 1.05rem; color: #4b5563; line-height: 1.6; }

    .policy-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 28px; align-items: start; }
    .policy-card { max-width: 100%; }

    .policy-block + .policy-block { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--line); }
    .block-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .block-ico { font-size: 1.35rem; }
    .block-header h2 { font-size: 1.2rem; margin: 0; color: var(--ink); }

    .policy-block p { margin: 0 0 10px; color: #374151; font-size: 0.95rem; line-height: 1.7; }
    .policy-list { padding-left: 20px; margin: 0; }
    .policy-list li { margin-bottom: 8px; color: #374151; font-size: 0.95rem; line-height: 1.65; }

    /* Sidebar */
    .sidebar-col { position: sticky; top: 140px; }
    .side-box h3 { font-size: 1.1rem; margin: 0 0 10px; color: var(--ink); }
    .side-box p { font-size: 0.88rem; color: #4b5563; line-height: 1.5; margin: 0 0 16px; }
    .contact-line { display: flex; gap: 10px; padding: 12px; background: #f9fafb; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 18px; }
    .contact-line .ico { font-size: 1.2rem; }
    .contact-line strong { display: block; font-size: 0.88rem; color: var(--ink); }
    .contact-line a { font-size: 0.88rem; color: var(--brand); text-decoration: underline; word-break: break-all; }
    .side-actions { display: flex; flex-direction: column; gap: 10px; }
    .btn-block { display: block; width: 100%; text-align: center; text-decoration: none; }

    @media (max-width: 900px) {
      .policy-layout { grid-template-columns: 1fr; }
      .sidebar-col { position: static; }
    }
  `],
})
export class PrivacyComponent {}
