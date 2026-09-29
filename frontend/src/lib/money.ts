/** Client-side money helpers (mirror of the backend pricing rules). */

export const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const discountPercent = (price: number, compareAt?: number | null) =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
