import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <!-- Hero Header -->
        <div class="about-hero">
          <div class="badge-pill">Our Story &amp; Purpose</div>
          <h1>🏢 About WonderCart</h1>
          <p class="hero-lead">
            WonderCart is a dedicated online platform offering a comprehensive range of products for children aged <strong>0 to 18 years</strong>, all under one roof.
          </p>
          <p class="hero-sub">
            Our mission is to transform the online shopping experience for parents and children across Pakistan by delivering convenience, quality, and joy in every purchase.
          </p>
        </div>

        <!-- Vision & Mission -->
        <div class="vm-grid">
          <div class="vm-card vision-card">
            <div class="vm-icon">🎯</div>
            <div class="vm-content">
              <h2>Our Vision</h2>
              <p>
                To become <strong>Pakistan’s leading online destination</strong> for children’s products, celebrated for trust, innovation, and delighting families in every city and town.
              </p>
            </div>
          </div>

          <div class="vm-card mission-card">
            <div class="vm-icon">🚀</div>
            <div class="vm-content">
              <h2>Our Mission</h2>
              <p>
                To provide a <strong>wide variety of high-quality products</strong> while maintaining a customer-centric approach that builds long-lasting trust, happiness, and complete satisfaction.
              </p>
            </div>
          </div>
        </div>

        <!-- Core Values Section -->
        <div class="values-section">
          <div class="section-title text-center">
            <div class="badge-pill">What We Stand For</div>
            <h2>💡 Our Core Values</h2>
            <p class="text-muted">The core principles that guide every decision and interaction at WonderCart.</p>
          </div>

          <div class="values-grid">
            <div class="value-item">
              <div class="val-ico">❤️</div>
              <h3>Customer Satisfaction</h3>
              <p>Every customer is our top priority. We listen, adapt, and go the extra mile to create effortless shopping journeys.</p>
            </div>

            <div class="value-item">
              <div class="val-ico">⚖️</div>
              <h3>Integrity &amp; Transparency</h3>
              <p>Clear policies, honest pricing, authentic product details, and open communication you can always count on.</p>
            </div>

            <div class="value-item">
              <div class="val-ico">⭐</div>
              <h3>Quality Assurance</h3>
              <p>Curated products tested and selected for safety, durability, comfort, and joy for growing kids.</p>
            </div>

            <div class="value-item">
              <div class="val-ico">🏷️</div>
              <h3>Affordability</h3>
              <p>Exceptional value with competitive pricing, exciting seasonal deals, and family-friendly savings.</p>
            </div>

            <div class="value-item full-width-sm">
              <div class="val-ico">🛡️</div>
              <h3>Secure &amp; Reliable Services</h3>
              <p>Safe data handling, protected payments, and dependable order fulfillment across all provinces.</p>
            </div>
          </div>
        </div>

        <!-- Key Pillars Grid -->
        <div class="pillars-grid">
          <!-- Secure Payments -->
          <div class="card card-pad pillar-card">
            <div class="pillar-top">
              <span class="pillar-ico">🔐</span>
              <h3>Secure Payments</h3>
            </div>
            <p>
              All transactions on WonderCart are protected through advanced security measures. Customer payment and personal data are safeguarded using industry-standard encryption and security protocols.
            </p>
          </div>

          <!-- Customer Support Excellence -->
          <div class="card card-pad pillar-card">
            <div class="pillar-top">
              <span class="pillar-ico">🤝</span>
              <h3>Customer Support Excellence</h3>
            </div>
            <p>
              Our dedicated support team ensures timely assistance and resolution of all customer concerns, reinforcing our commitment to service excellence.
            </p>
          </div>

          <!-- Efficient Delivery -->
          <div class="card card-pad pillar-card">
            <div class="pillar-top">
              <span class="pillar-ico">🚚</span>
              <h3>Efficient Delivery</h3>
            </div>
            <p>
              We strive to dispatch orders promptly through optimized logistics systems to ensure timely and reliable delivery across Pakistan.
            </p>
          </div>
        </div>

        <!-- Call to Action Banner -->
        <div class="about-cta card card-pad">
          <div class="cta-content">
            <h2>Ready to discover the best for your child?</h2>
            <p>Explore thousands of school essentials, toys, clothing, baby gear, and accessories today.</p>
          </div>
          <div class="cta-actions">
            <a routerLink="/shop" class="btn btn-primary">🛍️ Start Shopping</a>
            <a routerLink="/contact" class="btn btn-ghost">📞 Contact Us</a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .text-center { text-align: center; }
    .badge-pill { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand); background: rgba(59, 130, 246, 0.1); padding: 4px 12px; border-radius: 999px; margin-bottom: 12px; }

    /* Hero */
    .about-hero { text-align: center; max-width: 840px; margin: 0 auto 48px; }
    .about-hero h1 { font-size: 2.2rem; margin: 0 0 16px; color: var(--ink); }
    .hero-lead { font-size: 1.22rem; font-weight: 500; color: #1f2937; line-height: 1.6; margin: 0 0 12px; }
    .hero-sub { font-size: 1.02rem; color: #4b5563; line-height: 1.65; margin: 0; }

    /* Vision & Mission */
    .vm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 56px; }
    .vm-card { display: flex; gap: 20px; padding: 28px 24px; border-radius: 16px; align-items: flex-start; border: 1px solid transparent; }
    .vision-card { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-color: #bfdbfe; }
    .mission-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-color: #bbf7d0; }
    .vm-icon { font-size: 2.6rem; line-height: 1; flex-shrink: 0; }
    .vm-content h2 { font-size: 1.3rem; margin: 0 0 8px; color: #0f172a; }
    .vm-content p { margin: 0; font-size: 0.96rem; color: #334155; line-height: 1.65; }

    /* Values Section */
    .values-section { margin-bottom: 56px; }
    .section-title { margin-bottom: 32px; }
    .section-title h2 { font-size: 1.7rem; margin: 0 0 8px; color: var(--ink); }
    .section-title p { margin: 0; font-size: 0.95rem; }

    .values-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .value-item { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px 20px; text-align: center; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
    .value-item:hover { transform: translateY(-4px); border-color: #cbd5e1; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05); }
    .val-ico { font-size: 2.2rem; margin-bottom: 12px; }
    .value-item h3 { font-size: 1.05rem; margin: 0 0 8px; color: var(--ink); }
    .value-item p { margin: 0; font-size: 0.88rem; color: #4b5563; line-height: 1.55; }

    /* Pillars */
    .pillars-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 56px; }
    .pillar-card { border-top: 4px solid var(--brand); height: 100%; }
    .pillar-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .pillar-ico { font-size: 1.6rem; }
    .pillar-card h3 { font-size: 1.12rem; margin: 0; color: var(--ink); }
    .pillar-card p { margin: 0; font-size: 0.92rem; color: #374151; line-height: 1.65; }

    /* CTA Banner */
    .about-cta { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; display: flex; justify-content: space-between; align-items: center; gap: 24px; border-radius: 16px; padding: 32px 36px; }
    .cta-content h2 { margin: 0 0 6px; font-size: 1.4rem; color: #ffffff; }
    .cta-content p { margin: 0; font-size: 0.95rem; color: #94a3b8; }
    .cta-actions { display: flex; gap: 12px; flex-shrink: 0; }
    .cta-actions .btn-ghost { color: #ffffff; border-color: rgba(255,255,255,0.3); }
    .cta-actions .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: #ffffff; }

    @media (max-width: 900px) {
      .vm-grid { grid-template-columns: 1fr; }
      .pillars-grid { grid-template-columns: 1fr; }
      .about-cta { flex-direction: column; align-items: flex-start; text-align: left; padding: 24px; }
      .cta-actions { width: 100%; }
      .cta-actions .btn { flex: 1; text-align: center; }
    }
  `],
})
export class AboutComponent {}
