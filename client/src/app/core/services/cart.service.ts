import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product, ProductColor } from '../models/models';

/**
 * A cart line is identified by product *and* colour — the same bag in navy and
 * in red are two lines, not one. Everything that mutates a line takes this key
 * rather than a bare product id.
 */
export function lineKey(productId: string, color: string) {
  return `${productId}::${color}`;
}

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
      // `slug` and `color` were both added later — carts saved before that lack
      // them. A missing slug would render a product link pointing nowhere, and a
      // missing colour must read as "no colour chosen", not as undefined.
      return items
        // Drops the qty-0 lines a previous version of add() could write. They
        // render as an unremovable "Rs 0" row and make checkout fail, so a cart
        // carrying one has to be repaired here rather than on the next add.
        .filter((i) => Number(i.qty) >= 1)
        .map((i) => ({ ...i, slug: i.slug ?? '', color: i.color ?? '', colorHex: i.colorHex ?? '' }));
    } catch {
      return [];
    }
  }

  private save(items: CartItem[]) {
    localStorage.setItem('bs_cart', JSON.stringify(items));
    this._items.set(items);
  }

  keyOf(item: CartItem) {
    return lineKey(item.product, item.color);
  }

  /** How many of this product are already in the cart, across every colour. */
  private qtyOfProduct(productId: string, exceptKey?: string) {
    return this._items()
      .filter((i) => i.product === productId && lineKey(i.product, i.color) !== exceptKey)
      .reduce((n, i) => n + i.qty, 0);
  }

  /**
   * @returns false when the cart already holds every unit in stock, so the
   *          caller can say so instead of silently doing nothing. Adding
   *          regardless used to push a qty-0 line: it showed as a "Rs 0" row
   *          the − button could not clear, and checkout then failed with
   *          "Only N left", which named a limit the cart appeared to be under.
   */
  add(product: Product, qty = 1, color?: ProductColor | null): boolean {
    const chosen = color ?? null;
    const key = lineKey(product._id, chosen?.name ?? '');
    const items = [...this._items()];
    const existing = items.find((i) => lineKey(i.product, i.color) === key);
    // Stock is held per product, so all colours of it draw on the same pool.
    const headroom = product.stock - this.qtyOfProduct(product._id, key);
    if (headroom < 1) return false;

    if (existing) {
      existing.qty = Math.min(existing.qty + qty, headroom);
      existing.slug = existing.slug || product.slug; // backfill legacy entries
      existing.stock = product.stock;
    } else {
      items.push({
        product: product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0] || '',
        color: chosen?.name ?? '',
        colorHex: chosen?.hex ?? '',
        price: product.price,
        qty: Math.min(qty, headroom),
        stock: product.stock,
      });
    }
    this.save(items);
    return true;
  }

  setQty(key: string, qty: number) {
    const line = this._items().find((i) => lineKey(i.product, i.color) === key);
    if (!line) return;
    const headroom = line.stock - this.qtyOfProduct(line.product, key);
    const items = this._items().map((i) =>
      lineKey(i.product, i.color) === key ? { ...i, qty: Math.max(1, Math.min(qty, headroom)) } : i
    );
    this.save(items);
  }

  remove(key: string) {
    this.save(this._items().filter((i) => lineKey(i.product, i.color) !== key));
  }

  clear() {
    this.save([]);
  }
}
