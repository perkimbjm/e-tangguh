import { HttpException, HttpStatus } from '@nestjs/common';

export type FieldErrors = Record<string, string>;

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: FieldErrors };
}

/** Galat API dengan kode mesin dan pesan bahasa Indonesia. */
export class ApiException extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super({ error: { code, message, ...(fields ? { fields } : {}) } } satisfies ApiErrorBody, status);
    this.message = message;
  }

  static validation(fields: FieldErrors, message = 'Data tidak valid'): ApiException {
    return new ApiException(HttpStatus.BAD_REQUEST, 'VALIDASI', message, fields);
  }

  static unauthorized(message = 'Silakan masuk terlebih dahulu'): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'BELUM_MASUK', message);
  }

  static forbidden(message = 'Anda tidak berwenang mengakses sumber daya ini'): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, 'TIDAK_BERWENANG', message);
  }

  static notFound(message = 'Data tidak ditemukan'): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, 'TIDAK_DITEMUKAN', message);
  }

  static conflict(code: string, message: string): ApiException {
    return new ApiException(HttpStatus.CONFLICT, code, message);
  }

  static staleVersion(): ApiException {
    return new ApiException(
      HttpStatus.CONFLICT,
      'VERSI_USANG',
      'Data telah diubah pengguna lain. Muat ulang lalu ulangi perubahan Anda.',
    );
  }

  static yearLocked(year?: number): ApiException {
    const label = year ? ` ${year}` : '';
    return new ApiException(
      HttpStatus.LOCKED,
      'TAHUN_FINAL',
      `Tahun anggaran${label} sudah final dan terkunci. Ajukan revisi untuk mengubah data.`,
    );
  }

  static payloadTooLarge(message = 'Berkas terlalu besar'): ApiException {
    return new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, 'BERKAS_TERLALU_BESAR', message);
  }

  static tooManyRequests(): ApiException {
    return new ApiException(
      HttpStatus.TOO_MANY_REQUESTS,
      'LAJU_TERLAMPAUI',
      'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
    );
  }
}

/** Kode SQLSTATE khusus yang dilempar pemicu basis data aplikasi. */
export const SQLSTATE = {
  YEAR_LOCKED: 'ET423',
  AUDIT_IMMUTABLE: 'ET403',
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
} as const;
