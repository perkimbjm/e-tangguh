/** Ukuran kartu ISO/IEC 7810 ID-1 (CR80): 85,6 × 54 mm. 1 mm = 3,7795 px pada 96 dpi. */
export const MM = 3.7795;
export const CARD = { long: Math.round(85.6 * MM), short: Math.round(54 * MM) };
export type Orientation = 'landscape' | 'portrait';
export const size = (o: Orientation) =>
  o === 'landscape' ? { w: CARD.long, h: CARD.short } : { w: CARD.short, h: CARD.long };
