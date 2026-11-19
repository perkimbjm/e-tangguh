import type { DashboardDto } from '@etangguh/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';

export function useDashboard(year: number | null) {
  return useQuery({
    queryKey: ['dashboard', year],
    enabled: year !== null,
    queryFn: ({ signal }) => api.get<DashboardDto>(`/spm/${year}/dashboard`, signal),
  });
}
