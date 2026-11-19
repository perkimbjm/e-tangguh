import { Injectable } from '@nestjs/common';
import { ApiException } from '../../../common/errors/api-exception';

export interface VerifiedVolunteer {
  personId: string;
  certifications: string | null;
}

/**
 * Titik sambung ke modul relawan fitur 001 (T095). Implementasi nyata mengembalikan relawan
 * terverifikasi beserta sertifikasi dari bukti terverifikasi. Sampai modul itu ada, 501.
 */
export abstract class VolunteerSource {
  abstract getVerified(volunteerId: string): Promise<VerifiedVolunteer>;
}

@Injectable()
export class UnavailableVolunteerSource extends VolunteerSource {
  getVerified(): Promise<VerifiedVolunteer> {
    return Promise.reject(
      new ApiException(501, 'MODUL_RELAWAN_BELUM_TERSEDIA', 'Modul relawan belum tersedia. Tambahkan petugas secara manual atau lewat impor Form 5.A.5.'),
    );
  }
}
