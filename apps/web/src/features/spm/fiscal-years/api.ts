import type { FinalizeResult, FiscalYearDto, SnapshotDto } from '@etangguh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export function useSnapshots(year: number | null) {
  return useQuery({
    queryKey: ['snapshots', year],
    enabled: year !== null,
    queryFn: ({ signal }) =>
      api
        .get<{ items: SnapshotDto[] }>(`/spm/fiscal-years/${year}/snapshots`, signal)
        .then((r) => r.items),
  });
}

export function useFiscalYearMutations() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['fiscal-years'] });
    void qc.invalidateQueries({ queryKey: ['snapshots'] });
  };
  return {
    create: useMutation({
      mutationFn: (b: { year: number; copyFrom?: number }) =>
        api.post<FiscalYearDto & { copied?: { hazardZones: number; residents: number; officers: number; equipment: number; logistics: number } }>('/spm/fiscal-years', b),
      onSuccess: done,
    }),
    finalize: useMutation({
      mutationFn: (year: number) => api.post<FinalizeResult>(`/spm/fiscal-years/${year}/finalize`),
      onSuccess: done,
    }),
    revise: useMutation({
      mutationFn: ({ year, reason }: { year: number; reason: string }) =>
        api.post<FiscalYearDto>(`/spm/fiscal-years/${year}/revisions`, { reason }),
      onSuccess: done,
    }),
  };
}
