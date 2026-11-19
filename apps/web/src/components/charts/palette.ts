/**
 * Palet visualisasi (validasi dataviz: CVD ΔE ≥ 9,2; slot 3 < 3:1 → tabel nilai selalu tersedia).
 * Urutan tetap; warna mengikuti entitas, bukan peringkat.
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'] as const;
/** Satu rona untuk besaran (batang tunggal). */
export const MAGNITUDE = '#159fb8';
export const MAGNITUDE_SOFT = '#cff4f9';
export const fmt = (n: number) => n.toLocaleString('id-ID');
