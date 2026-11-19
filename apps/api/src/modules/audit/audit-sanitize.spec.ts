import { describe, expect, it } from 'vitest';
import { sanitizeAuditDetail } from './audit-sanitize';

describe('sanitizeAuditDetail', () => {
  it('membuang kunci NIK, KK, alamat, kesehatan, kebutuhan khusus', () => {
    const out = sanitizeAuditDetail({
      nik: '6371010101900001',
      nikHash: 'x',
      kk_number: '1',
      noKk: '1',
      address: 'Jl. A',
      alamat_rinci: 'Jl. B',
      health: 'x',
      specialNeeds: 'x',
      kelurahan_id: 'k1',
      count: 3,
    });
    expect(out).toEqual({ kelurahan_id: 'k1', count: 3 });
  });

  it('menyamarkan nilai berbentuk 16 digit dan bekerja rekursif', () => {
    expect(sanitizeAuditDetail({ note: 'NIK 6371010101900001', rows: [{ alamat: 'x', ok: 1 }] })).toEqual({
      note: '[disamarkan]',
      rows: [{ ok: 1 }],
    });
  });

  it('tidak menghapus kunci yang hanya mirip (mis. "kkm", "link")', () => {
    expect(sanitizeAuditDetail({ link: 'a', kkm: 1, unique: true, teknik: 1 })).toEqual({ link: 'a', kkm: 1, unique: true, teknik: 1 });
  });
});
