import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Banner, Category, ColorOption, ContactMessage, EmailAttachment, EmailTemplate, FlashSale, GuestOrderRef, JazzCashSettings, Order, Product, ProductPage, Review, ReviewSummary, ShopManager } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  list(query: Record<string, any> = {}): Observable<ProductPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<ProductPage>(`${this.api}/products`, { params });
  }
  getBySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.api}/products/${slug}`);
  }
  /**
   * Colours available under the listing's *current* filters.
   *
   * Takes the same query object as list() so the count beside each swatch
   * always matches what clicking it returns. Passing only the category left the
   * counts describing the whole catalogue: with a search active a swatch could
   * advertise 4 products and yield none.
   */
  colors(query: Record<string, any> = {}): Observable<ColorOption[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      // `color` is deliberately excluded by the caller — the facet reports what
      // each colour *would* return, so it must not be narrowed to one already.
      if (v !== undefined && v !== null && v !== '' && v !== false) params = params.set(k, String(v));
    });
    return this.http.get<ColorOption[]>(`${this.api}/products/colors`, { params });
  }
  // admin
  adminAll(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/products/admin/all`);
  }
  create(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.api}/products`, data);
  }
  update(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.api}/products/${id}`, data);
  }
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/products/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  /**
   * Uploads one image and returns the path to store on the product.
   * Sent as multipart — do NOT set Content-Type, the browser must add the
   * multipart boundary itself.
   */
  image(file: File): Observable<{ url: string; size: number }> {
    const body = new FormData();
    body.append('image', file);
    return this.http.post<{ url: string; size: number }>(`${this.api}/uploads/image`, body);
  }

  /** Uploads a product video file (MP4, WebM, MOV) up to 50MB. */
  video(file: File): Observable<{ url: string; size: number }> {
    const body = new FormData();
    body.append('video', file);
    return this.http.post<{ url: string; size: number }>(`${this.api}/uploads/video`, body);
  }

  /** Uploads a JazzCash payment screenshot (public — no auth needed). */
  paymentScreenshot(file: File): Observable<{ url: string; size: number }> {
    const body = new FormData();
    body.append('image', file);
    return this.http.post<{ url: string; size: number }>(`${this.api}/uploads/payment-screenshot`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}
  list(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/categories`);
  }
  create(data: Partial<Category> & { parent?: string | null }): Observable<Category> {
    return this.http.post<Category>(`${this.api}/categories`, data);
  }
  update(id: string, data: Partial<Category> & { parent?: string | null }): Observable<Category> {
    return this.http.put<Category>(`${this.api}/categories/${id}`, data);
  }
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/categories/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  /** Public: active slides only, already in running order. */
  list(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${this.api}/banners`);
  }
  /** Admin: includes switched-off slides. */
  adminAll(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${this.api}/banners/admin/all`);
  }
  create(data: Partial<Banner>): Observable<Banner> {
    return this.http.post<Banner>(`${this.api}/banners`, data);
  }
  update(id: string, data: Partial<Banner>): Observable<Banner> {
    return this.http.put<Banner>(`${this.api}/banners/${id}`, data);
  }
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/banners/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class FlashSaleService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  /** Public — the home page reads this before loading the deals. */
  get(): Observable<FlashSale> {
    return this.http.get<FlashSale>(`${this.api}/flash-sale`);
  }
  /** Admin. A singleton, so there is one PUT and no id. */
  update(data: Partial<FlashSale>): Observable<FlashSale> {
    return this.http.put<FlashSale>(`${this.api}/flash-sale`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  /** Public: anyone can write from the Contact us page. */
  send(data: { name: string; email: string; subject: string; body: string; orderNumber?: string }):
    Observable<{ message: string; reference: string }> {
    return this.http.post<{ message: string; reference: string }>(`${this.api}/messages`, data);
  }
  /** Admin inbox. `unread` is the total across the whole inbox, not this page. */
  list(filter?: 'unread'): Observable<{ items: ContactMessage[]; unread: number }> {
    let params = new HttpParams();
    if (filter) params = params.set('filter', filter);
    return this.http.get<{ items: ContactMessage[]; unread: number }>(`${this.api}/messages`, { params });
  }
  setRead(id: string, isRead: boolean): Observable<ContactMessage> {
    return this.http.put<ContactMessage>(`${this.api}/messages/${id}`, { isRead });
  }
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/messages/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  /** Public: everyone can read a product's reviews. */
  list(slug: string): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(`${this.api}/products/${slug}/reviews`);
  }
  /** Logged-in only. Posting again replaces your existing review. */
  submit(slug: string, data: { rating: number; comment: string }): Observable<Review> {
    return this.http.post<Review>(`${this.api}/products/${slug}/reviews`, data);
  }
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/reviews/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = environment.apiUrl;
  private readonly guestKey = 'bs_guest_orders';

  constructor(private http: HttpClient) {}

  place(data: any): Observable<Order> {
    return this.http.post<Order>(`${this.api}/orders`, data);
  }
  mine(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.api}/orders/mine`);
  }
  /** `token` lets a guest open their own order without an account. */
  get(id: string, token?: string): Observable<Order> {
    let params = new HttpParams();
    if (token) params = params.set('token', token);
    return this.http.get<Order>(`${this.api}/orders/${id}`, { params });
  }
  cancel(id: string, token?: string): Observable<Order> {
    let params = new HttpParams();
    if (token) params = params.set('token', token);
    return this.http.put<Order>(`${this.api}/orders/${id}/cancel`, {}, { params });
  }
  /** Guest order tracking from an order number + the email used at checkout. */
  lookup(orderNumber: string, email: string): Observable<{ id: string; orderNumber: string; token: string }> {
    return this.http.post<{ id: string; orderNumber: string; token: string }>(
      `${this.api}/orders/lookup`,
      { orderNumber, email }
    );
  }

  // --- guest orders remembered in this browser ---------------------------
  // A guest has no account to list orders against, so we keep the id + token
  // of anything they ordered here. Clearing site data loses them, which is why
  // `lookup()` above exists as the recovery path.

  guestOrders(): GuestOrderRef[] {
    try {
      return JSON.parse(localStorage.getItem(this.guestKey) || '[]');
    } catch {
      return [];
    }
  }

  rememberGuestOrder(ref: GuestOrderRef) {
    const all = this.guestOrders().filter((o) => o.id !== ref.id);
    all.unshift(ref);
    localStorage.setItem(this.guestKey, JSON.stringify(all.slice(0, 20)));
  }

  /** The stored token for an order, if this browser placed it as a guest. */
  guestTokenFor(id: string): string | undefined {
    return this.guestOrders().find((o) => o.id === id)?.token;
  }
  // admin
  adminAll(status?: string): Observable<Order[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Order[]>(`${this.api}/orders`, { params });
  }
  updateStatus(id: string, body: { status?: string; note?: string; paymentStatus?: string }): Observable<Order> {
    return this.http.put<Order>(`${this.api}/orders/${id}/status`, body);
  }
  verifyPayment(id: string): Observable<Order> {
    return this.http.put<Order>(`${this.api}/orders/${id}/verify-payment`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}
  overview(): Observable<any> { return this.http.get(`${this.api}/analytics/overview`); }
  sales(days = 30): Observable<any[]> { return this.http.get<any[]>(`${this.api}/analytics/sales?days=${days}`); }
  topProducts(): Observable<any[]> { return this.http.get<any[]>(`${this.api}/analytics/top-products`); }
  byCategory(): Observable<any[]> { return this.http.get<any[]>(`${this.api}/analytics/by-category`); }
  recommendations(): Observable<any> { return this.http.get(`${this.api}/analytics/recommendations`); }
}

@Injectable({ providedIn: 'root' })
export class ShopManagerService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  list(): Observable<ShopManager[]> {
    return this.http.get<ShopManager[]>(`${this.api}/shop-managers`);
  }
  get(id: string): Observable<ShopManager> {
    return this.http.get<ShopManager>(`${this.api}/shop-managers/${id}`);
  }
  create(data: { name: string; email: string; password: string; phone?: string; assignedCategories: string[]; assignedProducts: string[] }): Observable<ShopManager> {
    return this.http.post<ShopManager>(`${this.api}/shop-managers`, data);
  }
  update(id: string, data: Partial<{ name: string; phone: string; password: string; assignedCategories: string[]; assignedProducts: string[]; isActive: boolean }>): Observable<ShopManager> {
    return this.http.put<ShopManager>(`${this.api}/shop-managers/${id}`, data);
  }
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/shop-managers/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getJazzCash(): Observable<JazzCashSettings> {
    return this.http.get<JazzCashSettings>(`${this.api}/settings/jazzcash`);
  }
  updateJazzCash(data: Partial<JazzCashSettings>): Observable<JazzCashSettings> {
    return this.http.put<JazzCashSettings>(`${this.api}/settings/jazzcash`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  list(): Observable<EmailTemplate[]> {
    return this.http.get<EmailTemplate[]>(`${this.api}/email-templates`);
  }
  get(type: string): Observable<EmailTemplate> {
    return this.http.get<EmailTemplate>(`${this.api}/email-templates/${type}`);
  }
  update(type: string, data: Partial<EmailTemplate>): Observable<EmailTemplate> {
    return this.http.put<EmailTemplate>(`${this.api}/email-templates/${type}`, data);
  }
  testSend(data: { to: string; type: string; template?: Partial<EmailTemplate> }): Observable<{ message: string; messageId?: string }> {
    return this.http.post<{ message: string; messageId?: string }>(`${this.api}/email-templates/test-send`, data);
  }
  uploadAttachment(file: File): Observable<EmailAttachment> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<EmailAttachment>(`${this.api}/email-templates/attachment`, body);
  }
}

