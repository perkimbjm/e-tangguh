import type { SessionUser } from '@etangguh/shared';
import { ApiException } from '../errors/api-exception';

/**
 * Cakupan kelurahan untuk data warga (FR-029). Pendata kelurahan selalu dibatasi pada
 * kelurahannya; peran BPBD boleh memilih kelurahan mana pun atau seluruh kota (`null`).
 */
export const KelurahanScope = {
  /** Kelurahan efektif untuk penyaringan kueri. `null` = seluruh kelurahan. */
  resolve(user: SessionUser, requested?: string | null): string | null {
    if (user.role === 'pendata_kelurahan') {
      if (!user.kelurahanId) throw ApiException.forbidden('Akun pendata belum terikat kelurahan');
      if (requested && requested !== user.kelurahanId) {
        throw ApiException.forbidden('Anda hanya dapat mengakses data kelurahan Anda');
      }
      return user.kelurahanId;
    }
    return requested ?? null;
  },

  /** Melempar 403 bila pengguna tidak boleh menyentuh data kelurahan tersebut. */
  assert(user: SessionUser, kelurahanId: string): void {
    if (user.role === 'pendata_kelurahan' && user.kelurahanId !== kelurahanId) {
      throw ApiException.forbidden('Anda hanya dapat mengakses data kelurahan Anda');
    }
  },

  isRestricted(user: SessionUser): boolean {
    return user.role === 'pendata_kelurahan';
  },
};
