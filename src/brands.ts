import { useEffect, useState } from 'react';
import { api } from './api';

// The shop's brands with their logos (WooCommerce Brands in WordPress, via /api/catalog/brands), most products first.
// Asked for once per app session and shared by the Shop by brand row and the sponsor badge.
export type Brand = { slug: string; name: string; count: number; image: string | null };

let value: Brand[] | null | undefined;
let asking: Promise<Brand[] | null> | null = null;
export function useBrands(): Brand[] | null {
  const [list, setList] = useState(value);
  useEffect(() => {
    if (value !== undefined) return;
    (asking ??= api<Brand[]>('/api/catalog/brands')
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
