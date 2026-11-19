import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiException } from '../errors/api-exception';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { toApiException } from './api-exception.filter';

describe('toApiException', () => {
  it('meneruskan ApiException apa adanya', () => {
    const e = ApiException.staleVersion();
    expect(toApiException(e)).toBe(e);
    expect(e.getStatus()).toBe(409);
  });

  it('memetakan HttpException Nest ke bentuk galat standar', () => {
    const e = toApiException(new ForbiddenException());
    expect(e.getStatus()).toBe(403);
    expect(e.getResponse()).toEqual({ error: { code: 'TIDAK_BERWENANG', message: expect.any(String) } });
  });

  it('memetakan galat pemicu kunci tahun (ET423) ke 423', () => {
    const e = toApiException({ cause: { code: 'ET423' } });
    expect(e.getStatus()).toBe(423);
    expect(e.code).toBe('TAHUN_FINAL');
  });

  it('memetakan pelanggaran unik ke 409 tanpa menyebut nilai', () => {
    const e = toApiException({ code: '23505', detail: 'Key (nik_hash)=(...) already exists' });
    expect(e.getStatus()).toBe(409);
    expect(JSON.stringify(e.getResponse())).not.toContain('nik_hash');
  });

  it('galat tak dikenal menjadi 500 generik', () => {
    expect(toApiException(new Error('boom')).getStatus()).toBe(500);
  });
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ nik: z.string().length(16, 'NIK harus 16 digit') }));

  it('mengembalikan data yang sah', () => {
    expect(pipe.transform({ nik: '6371010101900001' })).toEqual({ nik: '6371010101900001' });
  });

  it('memetakan galat ke fields', () => {
    try {
      pipe.transform({ nik: '123' });
      expect.unreachable();
    } catch (e) {
      expect((e as ApiException).getStatus()).toBe(400);
      expect((e as ApiException).fields).toEqual({ nik: 'NIK harus 16 digit' });
    }
  });
});
