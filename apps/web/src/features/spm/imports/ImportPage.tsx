import type { ImportPreview as Preview } from '@etangguh/shared';
import { useQueryClient } from '@tanstack/react-query';
import { BPBD_ROLES } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { ImportErrorsTable } from './ImportErrorsTable';
import { ImportPreview } from './ImportPreview';
import { RegionMappingDialog } from './RegionMappingDialog';
import { templateUrl, useImportAction, useUploadImport } from './api';

export function ImportPage() {
  const { year, locked } = useFiscalYear();
  const toast = useToast();
  const qc = useQueryClient();
  const upload = useUploadImport(year);
  const action = useImportAction(year);
  const { user } = useSession();
  const [params] = useSearchParams();
  const isBpbd = !!user && (BPBD_ROLES as readonly string[]).includes(user.role);
  const [formCode, setFormCode] = useState(params.get('form') === '5.A.5' && isBpbd ? '5.A.5' : '5.A.1');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (new FormData(e.currentTarget).get('file') as File | null) ?? null;
    if (!file || file.size === 0) return setError('Pilih berkas .xlsx');
    setError(null);
    try {
      setPreview(await upload.mutateAsync({ file, formCode }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengunggah');
    }
  }

  async function run(kind: 'confirm' | 'cancel' | 'region-mapping', body?: unknown) {
    if (!preview) return;
    try {
      const next = await action.mutateAsync({ id: preview.id, action: kind, body });
      setPreview(next);
      if (kind === 'confirm') {
        toast(`${next.rowsNew} baris baru dan ${next.rowsChanged} baris berubah tersimpan`, 'sukses');
        void qc.invalidateQueries({ queryKey: ['residents'] });
      }
      if (kind === 'cancel') toast('Unggahan dibatalkan; data mentah dihapus', 'info');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal', 'galat');
    }
  }

  if (!year) return <p role="status">Belum ada tahun anggaran yang dibuka.</p>;
  if (locked) return <p className="rounded-md bg-slate-100 p-3">Tahun anggaran {year} sudah final; impor tidak tersedia.</p>;
  const open = preview?.status === 'divalidasi';

  return (
    <section aria-labelledby="judul-impor" className="space-y-4">
      <h1 id="judul-impor" className="text-xl font-semibold">
        Unggah lembar kerja · {year}
      </h1>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>Unduh templat, isi data warga (satu baris satu orang).</li>
        <li>Unggah berkas; sistem memvalidasi tiap baris dan menampilkan pratinjau.</li>
        <li>Periksa galat, pilih padanan kelurahan bila diminta, lalu konfirmasi.</li>
      </ol>
      <form onSubmit={onUpload} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm">
          Formulir
          <select value={formCode} onChange={(e) => setFormCode(e.target.value)} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5">
            <option value="5.A.1">5.A.1 Daftar warga</option>
            <option value="5.A.2">5.A.2 Kerawanan tempat tinggal</option>
            {isBpbd && <option value="5.A.5">5.A.5 Petugas operasi</option>}
          </select>
        </label>
        <a href={templateUrl(formCode, year)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          Unduh templat
        </a>
        <label className="text-sm">
          Berkas (.xlsx, maks. 10 MB)
          <input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-1 block text-sm" />
        </label>
        <button type="submit" disabled={upload.isPending} className="rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {upload.isPending ? 'Memvalidasi…' : 'Unggah dan validasi'}
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {preview && (
        <>
          <ImportPreview preview={preview} year={year} />
          {open && <RegionMappingDialog choices={preview.regionChoices} busy={action.isPending} onSubmit={(m) => void run('region-mapping', { mappings: m })} />}
          {open && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={action.isPending || preview.rowsNew + preview.rowsChanged === 0}
                onClick={() => void run('confirm')}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Konfirmasi {preview.rowsNew + preview.rowsChanged} baris
              </button>
              <button type="button" disabled={action.isPending} onClick={() => void run('cancel')} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
                Batalkan
              </button>
            </div>
          )}
          <ImportErrorsTable errors={preview.errors} truncated={preview.errorsTruncated} />
        </>
      )}
    </section>
  );
}
