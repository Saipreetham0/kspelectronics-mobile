import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from './store';

type Ctx = { has: (productId: number) => boolean };
const BoughtCtx = createContext<Ctx>({ has: () => false });

// The ids of products this signed-in shopper has ordered before, for the "Bought earlier" tag on product cards. Guests have none.
// ponytail: read once per login from the account's recent orders (the last 20), not refreshed after a new order until the next launch.
export function BoughtProvider({ children }: { children: React.ReactNode }) {
  const { user, account } = useStore();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const who = user ? (user.email ?? user.name) : '';
  useEffect(() => {
    if (!who) { setIds(new Set()); return; }
    let live = true;
    account()
      .then((a) => live && setIds(new Set((a.orders ?? []).flatMap((o) => o.items.map((i) => i.product_id)).filter((id): id is number => Boolean(id)))))
      .catch(() => {});
    return () => { live = false; };
  }, [who]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ has: (id: number) => ids.has(id) }), [ids]);
  return <BoughtCtx.Provider value={value}>{children}</BoughtCtx.Provider>;
}

export const useBought = () => useContext(BoughtCtx);
