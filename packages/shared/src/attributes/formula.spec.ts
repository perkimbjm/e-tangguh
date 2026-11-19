import { describe, expect, it } from 'vitest';
import { type AttributeInput, computeAttributes, scale } from './formula';

const TODAY = '2026-11-19';
const empty: AttributeInput = { certificates: [], trainings: [], deployments: [], availability: 'siaga', lastUpdatedAt: null, joinedAt: null, activeOfficerRoles: 0 };

describe('computeAttributes (rumus versi 1) — kasus uji wajib', () => {
  it('1. tanpa bukti: atribut berbasis bukti = 1; SIA mengikuti ketersediaan', () => {
    const r = computeAttributes(empty, undefined, TODAY);
    expect(r.values).toEqual({ kmp: 1, lat: 1, png: 1, sia: 70, sen: 1, kep: 1 });
    expect(computeAttributes({ ...empty, availability: 'terbatas' }, undefined, TODAY).values.sia).toBe(40);
  });

  it('2. sertifikat kedaluwarsa kemarin tidak dihitung hari ini', () => {
    const r = computeAttributes({ ...empty, certificates: [{ id: 'c1', label: 'PPGD', level: 'ahli', expiresAt: '2026-11-18' }] }, undefined, TODAY);
    expect(r.values.kmp).toBe(1);
    expect(computeAttributes({ ...empty, certificates: [{ id: 'c1', label: 'PPGD', level: 'ahli', expiresAt: TODAY }] }, undefined, TODAY).values.kmp).toBe(scale(3, 10));
  });

  it('3. hanya masukan terverifikasi: pemanggil tidak meneruskan bukti diajukan/ditolak (masukan kosong = nilai minimum)', () => {
    expect(computeAttributes({ ...empty, availability: null }, undefined, TODAY).values).toEqual({ kmp: 1, lat: 1, png: 1, sia: 1, sen: 1, kep: 1 });
  });

  it('4. nilai di atas ambang terpotong di 99', () => {
    const r = computeAttributes(
      { ...empty, deployments: Array.from({ length: 30 }, (_, i) => ({ id: `d${i}`, label: 'x', days: 5, coordinator: true })), lastUpdatedAt: '2026-10-01', joinedAt: '2000-01-01' },
      undefined,
      TODAY,
    );
    expect(r.values.png).toBe(99);
    expect(r.values.kep).toBe(99);
    expect(r.values.sen).toBe(99);
    expect(r.values.sia).toBe(99);
  });

  it('5. masukan tidak memuat jenis kelamin/usia: dua orang dengan bukti sama → hasil identik', () => {
    const a = computeAttributes({ ...empty, certificates: [{ id: 'x', label: 'SAR', level: 'lanjutan' }] }, undefined, TODAY);
    const b = computeAttributes({ ...empty, certificates: [{ id: 'y', label: 'SAR', level: 'lanjutan' }] }, undefined, TODAY);
    expect(a.values).toEqual(b.values);
    expect(a.overall).toBe(b.overall);
  });

  it('rincian menjelaskan setiap kontribusi; nilai keseluruhan memakai bobot', () => {
    const r = computeAttributes({ ...empty, trainings: [{ id: 't1', label: 'Pelatihan SAR', hours: 60, date: '2025-05-01' }, { id: 't0', label: 'Lama', hours: 60, date: '2019-01-01' }] }, undefined, TODAY);
    expect(r.breakdown.lat).toEqual([{ id: 't1', label: 'Pelatihan SAR', contribution: 60 }]);
    expect(r.values.lat).toBe(scale(60, 120));
    expect(r.overall).toBe(Math.round(0.25 * 1 + 0.15 * r.values.lat + 0.25 * 1 + 0.15 * 70 + 0.1 + 0.1));
  });
});
