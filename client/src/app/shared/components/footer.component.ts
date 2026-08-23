import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <footer class="footer">
      <div class="container">
        <!-- 5-Column Grid -->
        <div class="footer-grid">
          <!-- Brand Info -->
          <div class="footer-col brand-col">
            <a routerLink="/" class="footer-brand" aria-label="WonderCart Home">
              <img src="assets/WonderCart.png" alt="WonderCart" class="footer-logo-img" />
            </a>
            <p class="brand-desc">
              One Stop. Every Need. Every Age. Quality products for every stage of your child's life.
            </p>
          </div>

          <!-- Quick Links -->
          <div class="footer-col">
            <h4 class="footer-col-title">Quick Links</h4>
            <ul class="footer-links">
              <li><a routerLink="/">Home</a></li>
              <li><a routerLink="/shop">Shop</a></li>
              <li><a [routerLink]="['/shop']" [queryParams]="{ sort: 'newest' }">New Arrivals</a></li>
              <li><a [routerLink]="['/shop']" [queryParams]="{ sort: 'popular' }">Best Sellers</a></li>
              <li><a [routerLink]="['/shop']" [queryParams]="{ deals: 'true' }">Deals</a></li>
              <li><a routerLink="/terms" fragment="about">About Us</a></li>
              <li><a routerLink="/contact">Contact Us</a></li>
            </ul>
          </div>

          <!-- My Account -->
          <div class="footer-col">
            <h4 class="footer-col-title">My Account</h4>
            <ul class="footer-links">
              <li><a routerLink="/account/orders">My Orders</a></li>
              <li><a routerLink="/saved">Wishlist</a></li>
              <li><a routerLink="/account/orders">Track Order</a></li>
              <li><a routerLink="/terms" fragment="returns">Returns</a></li>
              <li><a routerLink="/login">Sign In</a></li>
            </ul>
          </div>

          <!-- Customer Service -->
          <div class="footer-col">
            <h4 class="footer-col-title">Customer Service</h4>
            <ul class="footer-links">
              <li><a routerLink="/contact">Help Center</a></li>
              <li><a routerLink="/terms" fragment="shipping">Shipping Policy</a></li>
              <li><a routerLink="/terms" fragment="returns">Return Policy</a></li>
              <li><a routerLink="/terms">Terms &amp; Conditions</a></li>
            </ul>
          </div>
        </div>

        <!-- Newsletter & Social Media Bar -->
        <div class="footer-middle">
          <div class="newsletter-wrap">
            <div>
              <h4 class="newsletter-title">Stay Connected</h4>
              <p class="newsletter-desc">Subscribe to get special offers, new arrivals &amp; more!</p>
            </div>
            <form class="newsletter-form" (ngSubmit)="subscribe()">
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="Enter your email"
                class="newsletter-input"
                required
              />
              <button type="submit" class="newsletter-btn" aria-label="Subscribe">
                <i class="far fa-paper-plane"></i>
              </button>
            </form>
            @if (subscribed) {
              <span class="sub-msg">Thank you for subscribing!</span>
            }
          </div>

          <!-- Social Links -->
          <div class="social-links">
            <a href="#" class="social-btn facebook" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a href="#" class="social-btn instagram" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer { background: #ffffff; border-top: 1px solid var(--line); padding-top: 56px; padding-bottom: 40px; margin-top: 48px; }

    /* 5-Column Grid */
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }

    .footer-brand { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; margin-bottom: 14px; }
    .footer-logo-img { height: 50px; width: auto; object-fit: contain; }
    .brand-desc { font-size: 0.85rem; color: #6b7280; line-height: 1.6; max-width: 320px; }

    .footer-col-title { font-family: var(--font-body); font-weight: 700; font-size: 0.95rem; color: #1f2937; margin: 0 0 16px; }
    .footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .footer-links a { font-size: 0.85rem; color: #6b7280; text-decoration: none; transition: color .15s; }
    .footer-links a:hover { color: var(--primary); }

    /* Newsletter & Social */
    .footer-middle { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 28px; gap: 24px; flex-wrap: wrap; }
    .newsletter-wrap { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .newsletter-title { font-weight: 700; font-size: 0.95rem; color: #1f2937; margin: 0 0 2px; }
    .newsletter-desc { font-size: 0.78rem; color: #6b7280; margin: 0; }

    .newsletter-form { position: relative; width: 320px; }
    .newsletter-input { width: 100%; padding: 10px 48px 10px 16px; border-radius: 999px; border: 1px solid #d1d5db; background: #f9fafb; font-size: 0.85rem; color: #1f2937; outline: none; }
    .newsletter-input:focus { border-color: var(--primary); background: #ffffff; }
    .newsletter-btn { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #6b7280; cursor: pointer; padding: 6px 10px; font-size: 0.95rem; transition: color .15s; }
    .newsletter-btn:hover { color: var(--primary); }
    .sub-msg { font-size: 0.78rem; color: #10b981; font-weight: 600; }

    .social-links { display: flex; gap: 10px; }
    .social-btn { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; text-decoration: none; font-size: 0.85rem; transition: opacity .15s, transform .12s; }
    .social-btn:hover { opacity: 0.85; transform: translateY(-2px); }
    .social-btn.facebook { background: #1877f2; }
    .social-btn.instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }

    @media (max-width: 860px) {
      .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
      .brand-col { grid-column: span 2; }
      .footer-middle { flex-direction: column; align-items: flex-start; }
      .newsletter-form { width: 100%; max-width: 360px; }
    }
    @media (max-width: 540px) {
      .footer-grid { grid-template-columns: 1fr; }
      .brand-col { grid-column: span 1; }
    }
  `],
})
export class FooterComponent {
  year = new Date().getFullYear();
  email = '';
  subscribed = false;

  subscribe() {
    if (this.email) {
      this.subscribed = true;
      this.email = '';
      setTimeout(() => (this.subscribed = false), 4000);
    }
  }
}
