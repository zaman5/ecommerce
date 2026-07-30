import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(this.load());
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().reduce((n, i) => n + i.qty, 0));
  readonly subtotal = computed(() => this._items().reduce((s, i) => s + i.price * i.qty, 0));

  private load(): CartItem[] {
    const raw = localStorage.getItem('bs_cart');
    if (!raw) return [];
    try {
      const items: CartItem[] = JSON.parse(raw);
      // `slug` was added later — carts saved before that have no slug, which
      // would render a product link pointing nowhere. Drop the link instead.
      return items.map((i) => ({ ...i, slug: i.slug ?? '' }));
    } catch {
      return [];
    }
  }

  private save(items: CartItem[]) {
    localStorage.setItem('bs_cart', JSON.stringify(items));
    this._items.set(items);
  }

  add(product: Product, qty = 1) {
    const items = [...this._items()];
    const existing = items.find((i) => i.product === product._id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
      existing.slug = existing.slug || product.slug; // backfill legacy entries
    } else {
      items.push({
        product: product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.price,
        qty: Math.min(qty, product.stock),
        stock: product.stock,
      });
    }
    this.save(items);
  }

  setQty(productId: string, qty: number) {
    const items = this._items().map((i) =>
      i.product === productId ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i
    );
    this.save(items);
  }

  remove(productId: string) {
    this.save(this._items().filter((i) => i.product !== productId));
  }

  clear() {
    this.save([]);
  }
}
