/** Tata letak titik untuk visual cerita; deterministik agar tidak berubah tiap render. */
export const VIEW_W = 400;
export const VIEW_H = 300;
export const ZONES = 5;
export const ZONE_LABELS = ['Kel. A', 'Kel. B', 'Kel. C', 'Kel. D', 'Kel. E'];

export interface Dot {
  id: number;
  map: { x: number; y: number };
  bar: { x: number; y: number };
  zone: number;
  rawan: boolean;
}

/** Garis tengah sungai melintasi peta. */
export function riverY(x: number): number {
  return 150 + 42 * Math.sin(x / 58) + 12 * Math.sin(x / 23);
}

export function riverPath(): string {
  const pts: string[] = [];
  for (let x = 20; x <= 380; x += 10) pts.push(`${x === 20 ? 'M' : 'L'}${x} ${riverY(x).toFixed(1)}`);
  return pts.join(' ');
}

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildDots(count = 70): Dot[] {
  const rand = seeded(20261119);
  const raw = Array.from({ length: count }, (_, id) => {
    const x = 34 + rand() * 332;
    const y = 40 + rand() * 220;
    const zone = Math.min(ZONES - 1, Math.floor(((x - 30) / 340) * ZONES));
    return { id, map: { x, y }, zone, rawan: Math.abs(y - riverY(x)) < 36 };
  });
  // Batang rekap: per kelurahan, warga rawan di bawah (ditumpuk dulu), lainnya di atasnya.
  const stacks = new Array<number>(ZONES).fill(0);
  const ordered = [...raw].sort((a, b) => Number(b.rawan) - Number(a.rawan));
  const barPos = new Map<number, { x: number; y: number }>();
  for (const d of ordered) {
    const level = stacks[d.zone]!++;
    const col = level % 3;
    const row = Math.floor(level / 3);
    barPos.set(d.id, { x: 62 + d.zone * 70 + (col - 1) * 12, y: 250 - row * 12 });
  }
  return raw.map((d) => ({ ...d, bar: barPos.get(d.id)! }));
}

export function zoneCounts(dots: Dot[]): { total: number; rawan: number }[] {
  return Array.from({ length: ZONES }, (_, z) => {
    const inZone = dots.filter((d) => d.zone === z);
    return { total: inZone.length, rawan: inZone.filter((d) => d.rawan).length };
  });
}
