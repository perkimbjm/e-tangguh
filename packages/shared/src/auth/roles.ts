/** Peran aplikasi (fitur 001 + fitur 002). Urutan tidak bermakna hierarki. */
export const ROLES = [
  'relawan',
  'pengurus',
  'pendata_kelurahan',
  'operator_bpbd',
  'admin_bpbd',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  relawan: 'Relawan',
  pengurus: 'Pengurus organisasi',
  pendata_kelurahan: 'Pendata kelurahan',
  operator_bpbd: 'Operator BPBD',
  admin_bpbd: 'Admin BPBD',
  super_admin: 'Super admin',
};

/** Peran yang boleh membuka modul SPM (K O A S pada contracts/api.md fitur 002). */
export const SPM_ROLES = ['pendata_kelurahan', 'operator_bpbd', 'admin_bpbd', 'super_admin'] as const;
export const BPBD_ROLES = ['operator_bpbd', 'admin_bpbd', 'super_admin'] as const;
export const ADMIN_ROLES = ['admin_bpbd', 'super_admin'] as const;
