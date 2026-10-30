export type Img = { id: number; src: string; thumbnail: string; alt: string };
export type Prices = { price: string; regular_price: string; sale_price: string; currency_symbol: string; currency_minor_unit: number; price_range: null | { min_amount: string; max_amount: string } };
export type Swatch = { color?: string; image?: string };
export type Swatches = Record<string, Record<string, Swatch>>; // taxonomy -> term slug -> swatch
export type Attribute = { id: number; name: string; taxonomy: string; has_variations: boolean; terms: { id: number; name: string; slug: string }[] };
export type Product = {
  id: number; name: string; slug: string; sku: string; short_description: string; description: string; on_sale: boolean; is_in_stock: boolean;
  average_rating: string; review_count: number; prices: Prices; images: Img[]; attributes: Attribute[]; has_options: boolean;
  variations: { id: number; attributes: { name: string; value: string }[] }[]; categories: { id: number; name: string; slug: string }[];
  low_stock_remaining?: number | null; // set by WooCommerce when only a few are left
};
export type Category = { id: number; name: string; slug: string; count: number; image: { src: string } | null };
export type CartItem = {
  key: string; id: number; quantity: number; name: string; sku: string; images: Img[]; prices: Prices; variation?: { attribute: string; value: string }[];
  totals: { line_total: string; line_total_tax?: string; currency_minor_unit: number };
  quantity_limits?: { minimum: number; maximum: number; multiple_of: number };
  permalink?: string; low_stock_remaining?: number | null;
};
export type Rate = { rate_id: string; name: string; price: string; selected: boolean };
export type Cart = {
  items: CartItem[]; items_count: number; needs_shipping?: boolean;
  totals: { total_items: string; total_items_tax?: string; total_discount: string; total_discount_tax?: string; total_shipping: string; total_shipping_tax?: string; total_tax: string; total_price: string; currency_minor_unit: number; currency_symbol: string };
  coupons: { code: string }[];
  shipping_rates?: { package_id: number | string; shipping_rates: Rate[] }[];
};
// The whole category tree as the website has it: every category with products, every level, in the store's own order (GET /api/catalog/categories?tree=full).
export type CategoryTree = { id: number; name: string; slug: string; count: number; image: { src: string } | null; children: CategoryTree[] };
export type Order = { id: number; number: string; status: string; date: string; total: string; items: { id: number; product_id?: number; name: string; quantity: number }[] };
export type Account = {
  user: { id: number; name: string; email?: string };
  customer: { first_name: string; last_name: string; billing: Record<string, string>; shipping: Record<string, string> } | null;
  orders: Order[] | null;
};

// A delivery partner's live position, when the store provides it (see docs/SERVER_API.md): shown as a map with a call button.
export type Rider = { name: string; phone?: string; lat: number; lng: number; updatedAt?: string };
