import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DbService } from '../../db/db.module';
import { regions } from '../../db/schema';

export type RegionLevel = 'kecamatan' | 'kelurahan';

export interface RegionSummary {
  id: string;
  code: string;
  name: string;
  level: RegionLevel;
  parentId: string | null;
}

export interface RegionCandidate extends RegionSummary {
  score: number;
}

const columns = {
  id: regions.id,
  code: regions.code,
  name: regions.name,
  level: regions.level,
  parentId: regions.parentId,
};

/** Menyeragamkan ejaan sebelum dicocokkan: huruf kecil, tanpa awalan "kel."/"kec.". */
export function normalizeRegionName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^\s*(kel(urahan)?|kec(amatan)?|desa)\.?\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class RegionsRepository {
  constructor(private readonly db: DbService) {}

  list(level?: RegionLevel, parentId?: string): Promise<RegionSummary[]> {
    const where = and(level ? eq(regions.level, level) : undefined, parentId ? eq(regions.parentId, parentId) : undefined);
    return this.db.executor().select(columns).from(regions).where(where).orderBy(asc(regions.name));
  }

  async findById(id: string): Promise<RegionSummary | null> {
    const [row] = await this.db.executor().select(columns).from(regions).where(eq(regions.id, id)).limit(1);
    return row ?? null;
  }

  /** Kandidat wilayah berdasarkan kemiripan trigram (`pg_trgm`), skor 0-1 menurun. */
  async matchByName(name: string, level: RegionLevel, limit = 5, parentId?: string): Promise<RegionCandidate[]> {
    const q = normalizeRegionName(name);
    if (!q) return [];
    const score = sql<number>`similarity(lower(${regions.name}), ${q})`;
    const rows = await this.db
      .executor()
      .select({ ...columns, score })
      .from(regions)
      .where(and(eq(regions.level, level), parentId ? eq(regions.parentId, parentId) : undefined, sql`${score} > 0.2`))
      .orderBy(sql`${score} desc`, asc(regions.name))
      .limit(limit);
    return rows.map((r) => ({ ...r, score: Number(r.score) }));
  }
}
