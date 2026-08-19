import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/models';

/** A product the shopper has bookmarked from the navbar's "Saved" list. */
export interface SavedItem {
  product: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  compareAtPrice: number;
  savedAt: string;
}

/**
 * Watchlist kept in the browser, like the cart. It deliberately does not need
 * an account — a guest can save things and still find them after a refresh.
 */
@Injectable({ providedIn: 'root' })
export class SavedService {
  private readonly key = 'bs_saved';
  private readonly _items = signal<SavedItem[]>(this.load());
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  private load(): SavedItem[] {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch {
      return [];
    }
  }

  private save(items: SavedItem[]) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this._items.set(items);
  }

  has(productId: string) {
    return this._items().some((i) => i.product === productId);
  }

  add(product: Product) {
    if (this.has(product._id)) return;
    this.save([
      {
        product: product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        savedAt: new Date().toISOString(),
      },
      ...this._items(),
    ]);
  }

  remove(productId: string) {
    this.save(this._items().filter((i) => i.product !== productId));
  }

  /** Returns the new state so a button can animate off the result. */
  toggle(product: Product): boolean {
    const saved = this.has(product._id);
    saved ? this.remove(product._id) : this.add(product);
    return !saved;
  }

  clear() {
    this.save([]);
  }
}
