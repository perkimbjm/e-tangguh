import type { AffectedStatus } from './events';
import type { FiscalYearStatus } from './fiscal-year';
import type { EmploymentStatus } from './officers';

/** Agregat Beranda. `officers` dan `events` bernilai null untuk pendata kelurahan. */
export interface DashboardDto {
  year: number;
  status: FiscalYearStatus;
  revisionNo: number;
  residents: {
    total: number;
    approved: number;
    pending: number;
    returned: number;
    withoutNik: number;
    families: number;
    poorFamilies: number;
    specialNeeds: number;
    vulnerable: number;
  };
  ageGroups: { balita: number; anak: number; dewasa: number; lansia: number };
  byHazard: { code: string; name: string; persons: number }[];
  byKelurahan: { id: string; name: string; approved: number; pending: number }[];
  hazardZones: number;
  officers: { total: number; byStatus: Record<EmploymentStatus, number>; duties: { trcPdb: number; trcKlb: number; ppe: number; ops: number } } | null;
  events: { total: number; byMonth: number[]; affected: Record<AffectedStatus, number> } | null;
}
