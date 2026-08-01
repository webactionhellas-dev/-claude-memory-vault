const fmt = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const money = (n: number): string => fmt.format(n);

export const discountPct = (price: number, compareAt?: number | null): number =>
  compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
