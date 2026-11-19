import { REGULATION_REF, columnLetter, type FormColumn, type FormDefinition } from './types';

const TITLE = 'FORM 5.A.3 REKAPITULASI KELOMPOK WARGA NEGARA BERDASARKAN KELOMPOK KERAWANAN DESA';

/**
 * Form 5.A.3 memiliki kelompok kolom variasi yang jumlahnya mengikuti data (templat resmi
 * menampilkan "VARIASI 1", "VARIASI 2", "VARIASI n"). `variationKeys` = kunci kolom per variasi.
 */
export function buildForm5A3(variationMasks: number[]): FormDefinition {
  const masks = variationMasks.length ? variationMasks : [0];
  const k = masks.length;
  const totalCol = 4 + 3 * k;
  const L = columnLetter;
  const cells: Record<string, string> = {
    A1: TITLE,
    A2: 'NO.',
    B2: 'KECAMATAN',
    C2: 'DESA/ KELURAHAN',
    D2: 'REKAPITULASI KELOMPOK WARGA NEGARA BERDASARKAN KELOMPOK KERAWANAN',
    [`${L(totalCol)}2`]: 'TOTAL',
    A5: '1',
    B5: '2',
    C5: '3',
  };
  const merged = [`A1:${L(totalCol + 2)}1`, 'A2:A4', 'B2:B4', 'C2:C4', `D2:${L(totalCol - 1)}2`];
  const columns: FormColumn[] = [
    { letter: 'A', number: 1, key: 'no', label: 'No.', kind: 'no', width: 6 },
    { letter: 'B', number: 2, key: 'kecamatan', label: 'Kecamatan', kind: 'text', width: 20 },
    { letter: 'C', number: 3, key: 'kelurahan', label: 'Desa/kelurahan', kind: 'text', width: 20 },
  ];
  const kkNums: number[] = [];
  const jiwaNums: number[] = [];
  masks.forEach((mask, i) => {
    const c = 4 + 3 * i;
    cells[`${L(c)}3`] = `VARIASI ${i + 1}`;
    merged.push(`${L(c)}3:${L(c + 2)}3`);
    ['KELOMPOK JENIS', 'KK', 'JIWA'].forEach((label, j) => {
      cells[`${L(c + j)}4`] = label;
      cells[`${L(c + j)}5`] = String(c + j);
    });
    kkNums.push(c + 1);
    jiwaNums.push(c + 2);
    columns.push(
      { letter: L(c), number: c, key: `v:${mask}:jenis`, label: 'Kelompok jenis', kind: 'text', width: 26 },
      { letter: L(c + 1), number: c + 1, key: `v:${mask}:kk`, label: 'KK', kind: 'number', width: 8 },
      { letter: L(c + 2), number: c + 2, key: `v:${mask}:jiwa`, label: 'Jiwa', kind: 'number', width: 8 },
    );
  });
  cells[`${L(totalCol)}4`] = 'KK';
  cells[`${L(totalCol + 1)}4`] = 'JIWA';
  cells[`${L(totalCol)}5`] = `${totalCol} = ${kkNums.join('+')}`;
  cells[`${L(totalCol + 1)}5`] = `${totalCol + 1} = ${jiwaNums.join('+')}`;
  merged.push(`${L(totalCol)}2:${L(totalCol + 1)}3`);
  columns.push(
    { letter: L(totalCol), number: totalCol, key: 'total:kk', label: 'Total KK', kind: 'number', width: 9 },
    { letter: L(totalCol + 1), number: totalCol + 1, key: 'total:jiwa', label: 'Total jiwa', kind: 'number', width: 9 },
  );
  return {
    formCode: '5.A.3',
    version: 1,
    regulationRef: REGULATION_REF,
    title: TITLE,
    sheetName: '5.A.3 REKAPITULASI KELOMPOK WAR',
    headerLastRow: 5,
    cells,
    merged,
    columns,
  };
}
