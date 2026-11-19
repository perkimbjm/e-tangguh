import { REGULATION_REF, type FormDefinition } from './types';

export const FORM_5A6: FormDefinition = {
  formCode: '5.A.6',
  version: 1,
  regulationRef: REGULATION_REF,
  title: 'FORM 5.A.6 REKAPITULASI WARGA NEGARA DAN PETUGAS PER JENIS BENCANA',
  sheetName: '5.A.6 REKAPITULASI WARGA NEGARA',
  headerLastRow: 3,
  cells: {
    A1: 'NO.', B1: 'JENIS BENCANA', C1: 'PENDUDUK', F1: 'PETUGAS (ORANG)', K1: 'TOTAL WAJIB LATIH (ORANG)', C2: 'JIWA', D2: 'KK',
    E2: 'DESA', F2: 'PETUGAS TRC PDB', G2: 'PETUGAS TRC KLB', H2: 'PETUGAS PPE', I2: 'PETUGAS OPERASI', J2: 'JUMLAH PETUGAS',
    A3: '1', B3: '2', C3: '3', D3: '4', E3: '5', F3: '6', G3: '7', H3: '8', I3: '9', J3: '10', K3: '11 = 4 + 10',
  },
  merged: ['A1:A2', 'B1:B2', 'C1:E1', 'F1:J1', 'K1:K2'],
  columns: [
    { letter: 'A', number: 1, key: 'no', label: 'No.', kind: 'no', width: 6 },
    { letter: 'B', number: 2, key: 'jenis', label: 'Jenis bencana', kind: 'text', width: 30 },
    ...['c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map((key, i) => ({
      letter: String.fromCharCode(67 + i),
      number: 3 + i,
      key,
      label: key,
      kind: 'number' as const,
      width: 12,
    })),
  ],
};
