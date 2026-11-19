import { HAZARDS } from '../hazards';
import { REGULATION_REF, columnLetter, type FormColumn, type FormDefinition } from './types';

const hazardColumns: FormColumn[] = HAZARDS.map((h, i) => ({
  letter: columnLetter(9 + i),
  number: 9 + i,
  key: `hazard_${h.code}`,
  label: h.name,
  kind: 'check',
  width: 10,
}));

export const FORM_5A2: FormDefinition = {
  formCode: '5.A.2',
  version: 1,
  regulationRef: REGULATION_REF,
  title: 'FORM 5.A.2 DAFTAR KERAWANAN TEMPAT TINGGAL WARGA NEGARA',
  sheetName: '5.A.2 DAFTAR KERAWANAN TEMPAT T',
  headerLastRow: 4,
  cells: {
    A1: 'DATA DASAR WARGA NEGARA', I1: 'JENIS KERAWANAN TEMPAT TINGGAL', S1: 'NOMOR VARIASI KELOMPOK KERAWANAN',
    T1: 'PERAN DALAM PENANGGULANGAN BENCANA',
    A2: 'NO .', B2: 'NAMA LENGKAP', D2: 'NIK', E2: 'NOMOR KK', F2: 'JENIS KELAMIN (L/P)', G2: 'DESA/ KELURAHA N',
    H2: 'KECAMATAN', I2: 'GEMPA BUMI', J2: 'TSUNAMI', K2: 'BANJIR', L2: 'TANAH LONGSOR', M2: 'LETUSAN GUNUNG API',
    N2: 'GELOMBAN G LAUT EKSTRIM', O2: 'ANGIN TOPAN', P2: 'KEKERINGA N', Q2: 'KEBAKARAN HUTAN DAN LAHAN',
    R2: 'EPIDEM I DAN WABAH', T2: 'WARGA NEGARA RAWAN BENCANA', U2: 'APARATUR YANG MENANGAN I SUB URUSAN BENCANA',
    V2: 'PETUGAS OPERASI TANGGAP DARURAT', B3: 'NAMA KEPALA KELUARGA', C3: 'NAMA ANGGOTA KELUARGA',
    A4: '1', B4: '2', C4: '3', D4: '4', E4: '5', F4: '6', G4: '7', H4: '8', I4: '9', J4: '10', K4: '11', L4: '12',
    M4: '13', N4: '14', O4: '15', P4: '16', Q4: '17', R4: '18', T4: '20', U4: '21', V4: '22',
  },
  merged: [
    'A1:H1', 'A2:A3', 'B2:C2', 'D2:D3', 'E2:E3', 'F2:F3', 'G2:G3', 'H2:H3', 'I1:R1', 'I2:I3', 'J2:J3', 'K2:K3', 'L2:L3',
    'M2:M3', 'N2:N3', 'O2:O3', 'P2:P3', 'Q2:Q3', 'R2:R3', 'S1:S3', 'T1:V1', 'T2:T3', 'U2:U3', 'V2:V3',
  ],
  columns: [
    { letter: 'A', number: 1, key: 'no', label: 'No.', kind: 'no', width: 6 },
    { letter: 'B', number: 2, key: 'headName', label: 'Nama kepala keluarga', kind: 'text', width: 26 },
    { letter: 'C', number: 3, key: 'memberName', label: 'Nama anggota keluarga', kind: 'text', width: 26 },
    { letter: 'D', number: 4, key: 'nik', label: 'NIK', kind: 'id16', width: 20 },
    { letter: 'E', number: 5, key: 'kk', label: 'Nomor KK', kind: 'id16', width: 20 },
    { letter: 'F', number: 6, key: 'gender', label: 'Jenis kelamin', kind: 'choice', width: 9 },
    { letter: 'G', number: 7, key: 'kelurahan', label: 'Desa/kelurahan', kind: 'text', width: 18 },
    { letter: 'H', number: 8, key: 'kecamatan', label: 'Kecamatan', kind: 'text', width: 18 },
    ...hazardColumns,
    { letter: 'S', number: null, key: 'variationNo', label: 'Nomor variasi', kind: 'number', derived: true, width: 12 },
    { letter: 'T', number: 20, key: 'roleResident', label: 'Warga negara rawan bencana', kind: 'check', derived: true, width: 12 },
    { letter: 'U', number: 21, key: 'roleApparatus', label: 'Aparatur', kind: 'check', derived: true, width: 12 },
    { letter: 'V', number: 22, key: 'roleOps', label: 'Petugas operasi', kind: 'check', derived: true, width: 12 },
  ],
};
