import type { RegionChoice } from '@etangguh/shared';
import { type RegionSummary, RegionsRepository, normalizeRegionName } from '../../regions/regions.repository';

export const AUTO_MATCH = 0.9;
export const CHOICE_MATCH = 0.5;

export type RegionMatch =
  | { status: 'auto'; region: Pick<RegionSummary, 'id' | 'name'> }
  | { status: 'choice'; spelling: string }
  | { status: 'unknown' };

/**
 * Memadankan ejaan kelurahan ke wilayah resmi: skor ≥ 0,9 otomatis; 0,5-0,9 ditawarkan sebagai
 * pilihan; di bawahnya tidak dikenal. Pilihan operator berlaku untuk semua baris berejaan sama.
 */
export class RegionMatcher {
  private readonly cache = new Map<string, RegionMatch>();
  private readonly choices = new Map<string, RegionChoice>();

  constructor(
    private readonly regions: RegionsRepository,
    existingChoices: RegionChoice[] = [],
  ) {
    for (const c of existingChoices) this.choices.set(normalizeRegionName(c.spelling), { ...c });
  }

  async match(spelling: string): Promise<RegionMatch> {
    const key = normalizeRegionName(spelling);
    if (!key) return { status: 'unknown' };
    const chosen = this.choices.get(key);
    if (chosen?.chosenId) {
      const c = chosen.candidates.find((x) => x.id === chosen.chosenId);
      return { status: 'auto', region: { id: chosen.chosenId, name: c?.name ?? spelling } };
    }
    const cached = this.cache.get(key);
    if (cached) return cached;

    const candidates = await this.regions.matchByName(spelling, 'kelurahan', 5);
    const best = candidates[0];
    let result: RegionMatch;
    if (best && (normalizeRegionName(best.name) === key || best.score >= AUTO_MATCH)) {
      result = { status: 'auto', region: { id: best.id, name: best.name } };
    } else if (best && best.score >= CHOICE_MATCH) {
      result = { status: 'choice', spelling };
      if (!this.choices.has(key)) {
        this.choices.set(key, {
          spelling,
          level: 'kelurahan',
          candidates: candidates.filter((c) => c.score >= CHOICE_MATCH).map((c) => ({ id: c.id, name: c.name, score: Math.round(c.score * 100) / 100 })),
          chosenId: null,
        });
      }
    } else {
      result = { status: 'unknown' };
    }
    this.cache.set(key, result);
    return result;
  }

  /** Daftar pilihan yang muncul selama validasi (termasuk yang sudah dipilih). */
  regionChoices(): RegionChoice[] {
    return [...this.choices.values()];
  }
}
