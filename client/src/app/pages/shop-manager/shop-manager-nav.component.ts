import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-shop-manager-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="sm-nav">
      <a routerLink="/shop-manager" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">📊 Dashboard</a>
      <a routerLink="/shop-manager/products" routerLinkActive="active">📦 My Products</a>
      <a routerLink="/shop-manager/orders" routerLinkActive="active">🧾 Orders</a>
      <a routerLink="/shop-manager/emails" routerLinkActive="active">📧 Emails</a>
      <a routerLink="/shop-manager/analytics" routerLinkActive="active">📈 Analytics</a>
    </div>
  `,
  styles: [`
    .sm-nav { 
      display: flex; gap: 8px; background: #fff; padding: 8px; border-radius: 999px; 
      box-shadow: var(--shadow-sm); border: 1px solid var(--line); margin-bottom: 26px; 
      width: fit-content; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; 
      scrollbar-width: none; 
    }
    .sm-nav::-webkit-scrollbar { display: none; }
    .sm-nav a { 
      font-family: var(--font-display); font-weight: 600; padding: 9px 18px; 
      border-radius: 999px; color: var(--muted); white-space: nowrap; flex-shrink: 0; 
      font-size: .92rem;
    }
    .sm-nav a.active { 
      background: #fff; color: #2f855a; box-shadow: var(--shadow-sm); 
      border: 1px solid #2f855a; padding: 8px 17px; 
    }
    .sm-nav a:hover:not(.active) { background: var(--cream); color: var(--ink); }
    @media (max-width: 900px) { 
      .sm-nav { width: 100%; border-radius: 16px; padding: 6px; gap: 6px; } 
      .sm-nav a { padding: 7px 14px; font-size: .85rem; }
    }
  `],
})
export class ShopManagerNavComponent {}
