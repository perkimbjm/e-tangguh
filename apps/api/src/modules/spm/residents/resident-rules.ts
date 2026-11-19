import { ageGroup, type AgeBands, type ApprovalStatus, type Role } from '@etangguh/shared';

/** Baris dari pendata kelurahan menunggu persetujuan; dari BPBD langsung disetujui (FR-028). */
export function initialApproval(role: Role, actorId: string): { approvalStatus: ApprovalStatus; approvedBy: string | null; approvedAt: Date | null } {
  return role === 'pendata_kelurahan'
    ? { approvalStatus: 'menunggu', approvedBy: null, approvedAt: null }
    : { approvalStatus: 'disetujui', approvedBy: actorId, approvedAt: new Date() };
}

export function computeAgeGroup(birthDate: string, fy: { ageReferenceDate: string; ageBands: AgeBands }) {
  return ageGroup(birthDate, fy.ageReferenceDate, fy.ageBands);
}

export function defaultSource(role: Role): string {
  return role === 'pendata_kelurahan' ? 'Pendata kelurahan' : 'BPBD Kota Banjarmasin';
}

export const today = () => new Date().toISOString().slice(0, 10);
