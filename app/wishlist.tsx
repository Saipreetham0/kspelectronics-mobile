import React from 'react';
import ProductsByIds from '@/components/ProductsByIds';
import { useWishlist } from '@/wishlist';

export default function Wishlist() {
  const { ids } = useWishlist();
  return <ProductsByIds ids={ids} empty="Tap the heart on any product to save it here." />;
}
