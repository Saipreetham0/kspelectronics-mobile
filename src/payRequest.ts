// Hand-off between the checkout and payment screens (kept out of the URL: it holds the payment order details).
export type PayRequest = { orderId: number; orderKey: string; rzpOrderId: string; amount: number; currency: string; keyId: string; prefill: { name: string; email: string; contact: string } };
let current: PayRequest | null = null;
export const setPayRequest = (p: PayRequest | null) => { current = p; };
export const getPayRequest = () => current;
