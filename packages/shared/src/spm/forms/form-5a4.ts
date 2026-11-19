import { REGULATION_REF, type FormDefinition } from './types';

export const FORM_5A4: FormDefinition = {
  formCode: '5.A.4',
  version: 1,
  regulationRef: REGULATION_REF,
  title: 'FORM 5.A.4 REKAPITULASI APARAT DAN WARGA NEGARA DI KAWASAN RAWAN BENCANA',
  sheetName: '5.A.4 REKAPITULASI APARAT DAN W',
  headerLastRow: 4,
  cells: {
    A1: 'NO.', B1: 'KECAMATAN', C1: 'DESA/ KELURAHAN', D1: 'JUMLAH APARATUR DI KAWASAN RAWAN BENCANA (ORANG)',
    I1: 'JUMLAH WARGA NEGARA DI KAWASAN RAWAN', N1: 'KETERANGAN', D2: 'PNS', E2: 'TNI', F2: 'POLRI', G2: 'SATLINMAS',
    H2: 'TENAGA KONTRAK', I2: 'WARGA NEGARA', K2: 'KERENTANAN', I3: 'JIWA', J3: 'KK', K3: 'KONDISI EKONOMI MISKIN (KK)',
    L3: 'BERKEBUTUHAN KHUSUS (ORANG)', M3: 'KELOMPOK RENTAN (ORANG)',
    A4: '1', B4: '2', C4: '3', D4: '4', E4: '5', F4: '6', G4: '7', H4: '8', I4: '9', J4: '10', K4: '11', L4: '12', M4: '13', N4: '14',
  },
  merged: ['A1:A3', 'B1:B3', 'C1:C3', 'D1:H1', 'D2:D3', 'E2:E3', 'F2:F3', 'G2:G3', 'H2:H3', 'I1:M1', 'I2:J2', 'K2:M2', 'N1:N3'],
  columns: [
    { letter: 'A', number: 1, key: 'no', label: 'No.', kind: 'no', width: 6 },
    { letter: 'B', number: 2, key: 'kecamatan', label: 'Kecamatan', kind: 'text', width: 20 },
    { letter: 'C', number: 3, key: 'kelurahan', label: 'Desa/kelurahan', kind: 'text', width: 20 },
    ...['c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13'].map((key, i) => ({
      letter: String.fromCharCode(68 + i),
      number: 4 + i,
      key,
      label: key,
      kind: 'number' as const,
      width: 11,
    })),
    { letter: 'N', number: 14, key: 'c14', label: 'Keterangan', kind: 'text', width: 22 },
  ],
};
