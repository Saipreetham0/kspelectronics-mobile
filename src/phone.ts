// A pasted +91 98765 43210 or 098765 43210 becomes the plain 10 digits; anything typed past ten is dropped.
export const tenDigits = (v: string) => { const d = v.replace(/\D/g, ''); return (d.length > 10 && d.startsWith('91') ? d.slice(2) : d.replace(/^0(?=\d{10})/, '')).slice(0, 10); };
