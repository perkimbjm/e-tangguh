import type { HazardZoneDto, HazardZoneRequest } from '@etangguh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export function useHazardZones(year: number | null, kelurahan?: string) {
  return useQuery({
    queryKey: ['hazard-zones', year, kelurahan],
    enabled: year !== null,
    queryFn: ({ signal }) =>
      api
        .get<{ items: HazardZoneDto[] }>(
          `/spm/${year}/hazard-zones${kelurahan ? `?kelurahan=${kelurahan}` : ''}`,
          signal,
        )
        .then((r) => r.items),
  });
}

export function useHazardZoneMutations(year: number | null) {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ['hazard-zones'] });
  return {
    create: useMutation({
      mutationFn: (b: HazardZoneRequest) => api.post(`/spm/${year}/hazard-zones`, b),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, ...b }: Partial<HazardZoneRequest> & { id: string }) =>
        api.patch(`/spm/${year}/hazard-zones/${id}`, b),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/spm/${year}/hazard-zones/${id}`),
      onSuccess: done,
    }),
  };
}
