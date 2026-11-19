import { describe, expect, it } from 'vitest';
import { sniffMime } from './mime-sniff';

describe('sniffMime', () => {
  it('mengenali PDF, PNG, JPEG', () => {
    expect(sniffMime(Buffer.from('%PDF-1.7 ...'))).toBe('application/pdf');
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('membedakan XLSX dari ZIP biasa', () => {
    const zipHead = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(sniffMime(Buffer.concat([zipHead, Buffer.from('....xl/workbook.xml')]))).toContain('spreadsheetml');
    expect(sniffMime(Buffer.concat([zipHead, Buffer.from('....data.txt')]))).toBe('application/zip');
  });

  it('menolak isi tak dikenal (mis. skrip berekstensi .pdf)', () => {
    expect(sniffMime(Buffer.from('<script>alert(1)</script>'))).toBeNull();
  });
});
