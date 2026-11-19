import type { DrillResult, RecapTable } from '@etangguh/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export function useRecap(year: number | null, formCode: string) {
  return useQuery({
    queryKey: ['recap', year, formCode],
    enabled: year !== null,
    queryFn: ({ signal }) => api.get<RecapTable>(`/spm/${year}/recap/${formCode}`, signal),
  });
}

export function useDrilldown(year: number | null, formCode: string, cellKey: string | null) {
  return useQuery({
    queryKey: ['drill', year, formCode, cellKey],
    enabled: year !== null && cellKey !== null,
    queryFn: ({ signal }) =>
      api.get<DrillResult>(
        `/spm/${year}/recap/${formCode}/cells/${encodeURIComponent(cellKey!)}/rows`,
        signal,
      ),
    gcTime: 0,
  });
}
