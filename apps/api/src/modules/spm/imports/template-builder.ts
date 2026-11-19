import { Injectable } from '@nestjs/common';
import { type FormDefinition, type SessionUser, getFormDefinition, variationLabel } from '@etangguh/shared';
import ExcelJS from 'exceljs';
import { ApiException } from '../../../common/errors/api-exception';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { RegionsRepository } from '../../regions/regions.repository';
import { drawFormHeader, drawHelperColumns } from '../exports/xlsx-header';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { HazardZonesRepository } from '../hazard-zones/hazard-zones.repository';

const DATA_ROWS = 2000;

type Validation = ExcelJS.DataValidation;
const list = (formula: string, prompt?: string): Validation => ({
  type: 'list',
  allowBlank: true,
  formulae: [formula],
  showErrorMessage: true,
  errorTitle: 'Nilai tidak sah',
  error: prompt ?? 'Pilih dari daftar',
});

/** Templat kosong ber-validasi: kepala resmi, daftar pilihan, panjang NIK, dan lembar rujukan. */
@Injectable()
export class TemplateBuilder {
  constructor(
    private readonly years: FiscalYearsService,
    private readonly regions: RegionsRepository,
    private readonly zones: HazardZonesRepository,
  ) {}

  async build(formCode: string, user: SessionUser, year?: number): Promise<{ buffer: Buffer; filename: string }> {
    const def = getFormDefinition(formCode);
    if (!def || !['5.A.1', '5.A.2', '5.A.5'].includes(def.formCode)) throw ApiException.notFound('Templat formulir tidak tersedia');
    const kelurahanId = KelurahanScope.resolve(user);
    const allKelurahan = await this.regions.list('kelurahan');
    const kelurahan = kelurahanId ? allKelurahan.filter((k) => k.id === kelurahanId) : allKelurahan;
    const fiscalYears = await this.years.list();
    const fy = year ? fiscalYears.find((f) => f.year === year) : fiscalYears.find((f) => f.status !== 'final');
    const zones = fy ? await this.zones.list(fy.id, kelurahanId) : [];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'e-Tangguh';
    const ws = wb.addWorksheet(def.sheetName, { views: [{ state: 'frozen', ySplit: def.headerLastRow }] });
    const first = drawFormHeader(ws, def);
    const helpers = drawHelperColumns(ws, def);
    const last = first + DATA_ROWS - 1;
    const range = (letter: string) => `${letter}${first}:${letter}${last}`;
    // Format hanya untuk baris data; sel kepala (mis. nomor kolom 8) tidak boleh ikut berformat tanggal.
    const formatData = (letter: string, numFmt: string) => {
      for (let r = first; r <= last; r++) ws.getCell(`${letter}${r}`).numFmt = numFmt;
    };
    const add = (letter: string, v: Validation) => (ws as unknown as { dataValidations: { add(a: string, v: Validation): void } }).dataValidations.add(range(letter), v);

    for (const c of def.columns) {
      if (c.kind === 'id16') {
        formatData(c.letter, '@');
        add(c.letter, { type: 'textLength', operator: 'equal', allowBlank: true, formulae: [16], showErrorMessage: true, errorTitle: 'NIK/KK', error: 'Harus 16 digit' });
      }
      if (c.kind === 'date') {
        formatData(c.letter, 'dd/mm/yyyy');
        add(c.letter, { type: 'date', operator: 'lessThan', allowBlank: true, formulae: [new Date()], showErrorMessage: true, error: 'Tanggal lahir tidak boleh di masa depan' });
      }
      if (c.key === 'gender') add(c.letter, list('"L,P"'));
      if (c.key === 'economy') add(c.letter, list('"miskin,tidak miskin"'));
      if (c.key === 'specialNeedsFlag') add(c.letter, list('"ya,tidak"'));
      if (c.kind === 'check' && !c.derived) add(c.letter, list('"v"', 'Isi "v" bila rawan, kosongkan bila tidak'));
      if (c.key === 'kelurahan' && kelurahan.length) add(c.letter, list(`Rujukan!$A$2:$A$${kelurahan.length + 1}`));
      if (c.derived) ws.getColumn(c.letter).font = { color: { argb: 'FF8A8A8A' } };
    }
    for (const key of ['rt', 'rw']) {
      const letter = helpers.get(key);
      if (letter) add(letter, { type: 'whole', operator: 'between', allowBlank: true, formulae: [1, 999], showErrorMessage: true, error: 'Isi angka' });
    }

    this.addReferenceSheet(wb, def, kelurahan, zones, fy?.year);
    return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), filename: `templat-form-${def.formCode.replace(/\./g, '')}.xlsx` };
  }

  private addReferenceSheet(
    wb: ExcelJS.Workbook,
    def: FormDefinition,
    kelurahan: { id: string; name: string }[],
    zones: { kelurahanName: string; rw: string; rt: string | null; hazardMask: number }[],
    year?: number,
  ): void {
    const ref = wb.addWorksheet('Rujukan');
    ref.getCell('A1').value = 'Kelurahan';
    kelurahan.forEach((k, i) => (ref.getCell(`A${i + 2}`).value = k.name));
    ref.getCell('C1').value = `Kawasan rawan bencana${year ? ` TA ${year}` : ''}`;
    ref.getRow(2).getCell(3).value = 'Kelurahan';
    ref.getRow(2).getCell(4).value = 'RW';
    ref.getRow(2).getCell(5).value = 'RT';
    ref.getRow(2).getCell(6).value = 'Jenis bencana';
    zones.forEach((z, i) => {
      const row = ref.getRow(i + 3);
      row.getCell(3).value = z.kelurahanName;
      row.getCell(4).value = z.rw;
      row.getCell(5).value = z.rt ?? 'seluruh RW';
      row.getCell(6).value = variationLabel(z.hazardMask);
    });
    ref.getCell('H1').value = 'Petunjuk';
    const notes =
      def.formCode === '5.A.1'
        ? [
            'Isi nama pada kolom 2 bila kepala keluarga, atau kolom 3 bila anggota keluarga.',
            'Kolom RT dan RW (kuning) wajib diisi bila alamat tidak memuat "RT .. RW ..".',
            'Bila NIK belum ada, kosongkan NIK dan isi kolom ALASAN TANPA NIK.',
            'Kolom 15 (kelompok umur rentan) dihitung sistem; boleh dikosongkan.',
            'Hanya warga di RT/RW kawasan rawan (lihat daftar di kiri) yang diterima.',
          ]
        : def.formCode === '5.A.5'
          ? [
              'Centang tepat satu status petugas (kolom 15-20).',
              'Kolom JABATAN (kuning): kasi_trantibumlinmas, babinsa, bhabinkamtibmas, linmas, relawan, lainnya.',
              'Kolom KELURAHAN TUGAS (kuning) menentukan hitungan aparatur Form 5.A.4; bila kosong dipakai kelurahan domisili.',
              'Alamat, kondisi ekonomi, dan kebutuhan khusus diambil dari data warga bila petugas tercatat sebagai warga.',
            ]
          : ['Isi "v" pada jenis kerawanan tempat tinggal.', 'Warga harus sudah tercatat pada Form 5.A.1 tahun yang sama.', 'Kolom 19-22 dihitung sistem.'];
    notes.forEach((n, i) => (ref.getCell(`H${i + 2}`).value = n));
    for (const [c, w] of [['A', 24], ['C', 22], ['D', 6], ['E', 12], ['F', 40], ['H', 80]] as const) ref.getColumn(c).width = w;
    for (const addr of ['A1', 'C1', 'H1']) ref.getCell(addr).font = { bold: true };
  }
}
