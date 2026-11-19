import { BPBD_ROLES, type Role } from '@etangguh/shared';
import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  type LucideIcon,
  MapPinned,
  Package,
  ShieldCheck,
  Siren,
  Upload,
  Users,
  Wrench,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  roles?: readonly Role[];
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Ringkasan',
    items: [{ to: '/app', label: 'Beranda', icon: LayoutDashboard, end: true }],
  },
  {
    group: 'Pendataan warga',
    items: [
      { to: '/app/warga', label: 'Data warga', icon: Users },
      { to: '/app/impor', label: 'Unggah lembar kerja', icon: Upload },
      { to: '/app/persetujuan', label: 'Persetujuan', icon: CheckCircle2, roles: BPBD_ROLES },
      { to: '/app/kelengkapan', label: 'Kelengkapan', icon: ClipboardCheck },
      { to: '/app/kawasan-rawan', label: 'Kawasan rawan', icon: MapPinned },
    ],
  },
  {
    group: 'Operasi',
    items: [
      { to: '/app/petugas', label: 'Petugas & kesiapan', icon: ShieldCheck, roles: BPBD_ROLES },
      { to: '/app/kejadian', label: 'Kejadian bencana', icon: Siren, roles: BPBD_ROLES },
      { to: '/app/peralatan', label: 'Peralatan', icon: Wrench, roles: BPBD_ROLES },
      { to: '/app/logistik', label: 'Stok logistik', icon: Package, roles: BPBD_ROLES },
    ],
  },
  {
    group: 'Pelaporan SPM',
    items: [
      { to: '/app/rekap', label: 'Rekapitulasi', icon: BarChart3 },
      { to: '/app/ekspor', label: 'Ekspor formulir', icon: FileSpreadsheet },
      {
        to: '/app/tahun-anggaran',
        label: 'Tahun anggaran',
        icon: CalendarCheck,
        roles: BPBD_ROLES,
      },
    ],
  },
];
