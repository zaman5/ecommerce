import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, GuestOrderRef, Order, Product, ProductPage, Review, ReviewSummary } from '../models/models';

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
export class CategoryService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}
  list(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/categories`);
  }
  create(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.api}/categories`, data);
  }
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/categories/${id}`);
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
