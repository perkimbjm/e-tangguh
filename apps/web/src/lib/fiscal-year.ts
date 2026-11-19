import type { FiscalYearDto } from '@etangguh/shared';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from './api-client';

export function useFiscalYears() {
  return useQuery({
    queryKey: ['fiscal-years'],
    queryFn: ({ signal }) =>
      api.get<{ items: FiscalYearDto[] }>('/spm/fiscal-years', signal).then((r) => r.items),
  });
}

/** Tahun anggaran aktif: parameter URL `ta`, atau tahun terbaru. */
export function useFiscalYear(): {
  year: number | null;
  info: FiscalYearDto | undefined;
  locked: boolean;
} {
  const [params] = useSearchParams();
  const { data } = useFiscalYears();
  const fromUrl = Number(params.get('ta'));
  const info = data?.find((f) => f.year === fromUrl) ?? data?.[0];
  return { year: info?.year ?? null, info, locked: info?.status === 'final' };
}
