import type { AttributeCode, AttributeResult } from './formula';

/** Data kartu petugas yang dikirim ke antarmuka (tanpa NIK, kontak, atau data kesehatan). */
export interface OfficerCardDto {
  id: string;
  fullName: string;
  initials: string;
  position: string;
  positionLabel: string;
  employmentLabel: string;
  dutyKelurahanName: string | null;
  duties: string[];
  hazardMask: number;
  availability: 'siaga' | 'terbatas' | 'tidak_tersedia';
  attributes: AttributeResult;
  /** Atribut yang belum memiliki sumber data pada modul SPM (mis. jam pelatihan). */
  noData: AttributeCode[];
  stats: { certificates: number; deployments: number; yearsActive: number };
}
