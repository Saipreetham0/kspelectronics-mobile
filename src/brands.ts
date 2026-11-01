import { useEffect, useState } from 'react';
import { api } from './api';
import { SITE_URL } from './config';

// The shop's brands with their logos (WooCommerce Brands in WordPress, via /api/catalog/brands), most products first.
// Asked for once per app session and shared by the Shop by brand row and the sponsor badge.
export type Brand = { slug: string; name: string; count: number; image: string | null };

// WooCommerce's public Store API brand list (no key needed), shaped like the store's /api/catalog/brands.
async function fromWordPress(): Promise<Brand[]> {
  const res = await fetch(`${SITE_URL}/wp-json/wc/store/v1/products/brands?per_page=100`);
  if (!res.ok) throw new Error(`brands ${res.status}`);
  const d = (await res.json()) as { slug: string; name: string; count: number; image?: { src?: string } | null }[];
  return d.map((b) => ({ slug: b.slug, name: b.name, count: b.count, image: b.image?.src ?? null })).sort((a, b) => b.count - a.count);
}

let value: Brand[] | null | undefined;
let asking: Promise<Brand[] | null> | null = null;
export function useBrands(): Brand[] | null {
  const [list, setList] = useState(value);
  useEffect(() => {
    if (value !== undefined) return;
    (asking ??= api<Brand[]>('/api/catalog/brands')
      .catch(fromWordPress) // the store's route can fail (502) while WordPress's own public list still answers
      .then((d) => (value = Array.isArray(d) ? d : null))
      .catch(() => { asking = null; return null; })) // not remembered: asked again next time
      .then(setList);
  }, []);
  return list ?? null;
}

// A brand's logo, when WordPress has one (https only).
export const logoOf = (brands: Brand[] | null, slug: string) => {
  const src = brands?.find((b) => b.slug === slug)?.image;
  return src && /^https:\/\//.test(src) ? src : null;
};
