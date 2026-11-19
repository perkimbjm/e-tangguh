import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiException, type ApiErrorBody, SQLSTATE } from '../errors/api-exception';

const DEFAULT_CODES: Record<number, [string, string]> = {
  400: ['PERMINTAAN_TIDAK_VALID', 'Permintaan tidak valid'],
  401: ['BELUM_MASUK', 'Silakan masuk terlebih dahulu'],
  403: ['TIDAK_BERWENANG', 'Anda tidak berwenang mengakses sumber daya ini'],
  404: ['TIDAK_DITEMUKAN', 'Data tidak ditemukan'],
  405: ['METODE_TIDAK_DIIZINKAN', 'Metode tidak diizinkan'],
  409: ['KONFLIK', 'Data bertentangan dengan data yang sudah ada'],
  413: ['BERKAS_TERLALU_BESAR', 'Berkas terlalu besar'],
  423: ['TAHUN_FINAL', 'Tahun anggaran sudah final dan terkunci'],
  429: ['LAJU_TERLAMPAUI', 'Terlalu banyak permintaan'],
};

function pgCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Mengubah galat apa pun menjadi `{ error: { code, message, fields } }`. */
export function toApiException(err: unknown): ApiException {
  if (err instanceof ApiException) return err;
  if (err instanceof HttpException) {
    const status = err.getStatus();
    const [code, message] = DEFAULT_CODES[status] ?? ['GALAT', 'Terjadi galat'];
    return new ApiException(status, code, message);
  }
  switch (pgCode(err)) {
    case SQLSTATE.YEAR_LOCKED:
      return ApiException.yearLocked();
    case SQLSTATE.AUDIT_IMMUTABLE:
      return ApiException.forbidden('Jejak audit tidak dapat diubah');
    case SQLSTATE.UNIQUE_VIOLATION:
      // Sengaja tidak menyebut nilai atau pemilik data yang bentrok.
      return ApiException.conflict('DATA_GANDA', 'Data yang sama sudah tercatat');
    case SQLSTATE.FOREIGN_KEY_VIOLATION:
      return ApiException.validation({}, 'Data rujukan tidak ditemukan');
    case SQLSTATE.CHECK_VIOLATION:
      return ApiException.validation({}, 'Data tidak memenuhi aturan');
    default:
      return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, 'GALAT_SERVER', 'Terjadi galat pada server');
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const api = toApiException(exception);
    const status = api.getStatus();
    if (status >= 500) {
      // Hanya nama dan pesan galat; parameter kueri tidak dicatat agar data pribadi tidak bocor ke log.
      const e = exception as Error;
      this.logger.error(`${e?.name ?? 'Error'}: ${pgCode(exception) ?? ''} ${e?.message?.split('\n')[0] ?? ''}`);
    }
    res.status(status).json(api.getResponse() as ApiErrorBody);
  }
}
