import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/models';

interface AuthResponse { token: string; user: User; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  private readonly _user = signal<User | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isShopManager = computed(() => this._user()?.role === 'shopmanager');

  constructor(private http: HttpClient) {}

  private loadUser(): User | null {
    const raw = localStorage.getItem('bs_user');
    return raw ? JSON.parse(raw) : null;
  }

  get token(): string | null {
    return localStorage.getItem('bs_token');
  }

  private persist(res: AuthResponse) {
    localStorage.setItem('bs_token', res.token);
    localStorage.setItem('bs_user', JSON.stringify(res.user));
    this._user.set(res.user);
  }

  register(data: { name: string; email: string; password: string; phone?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/register`, data).pipe(tap((r) => this.persist(r)));
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, data).pipe(tap((r) => this.persist(r)));
  }

  updateProfile(data: Partial<User>): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${this.api}/auth/me`, data).pipe(
      tap((r) => {
        localStorage.setItem('bs_user', JSON.stringify(r.user));
        this._user.set(r.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('bs_token');
    localStorage.removeItem('bs_user');
    this._user.set(null);
  }
}
