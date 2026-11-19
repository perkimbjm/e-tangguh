import type { CreateOfficerRequest, OfficerDto, UpdateOfficerRequest } from '@etangguh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export function useOfficers(year: number | null) {
  return useQuery({
    queryKey: ['officers', year],
    enabled: year !== null,
    queryFn: ({ signal }) => api.get<{ items: OfficerDto[] }>(`/spm/${year}/officers`, signal).then((r) => r.items),
  });
}

export function useOfficerMutations(year: number | null) {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['officers'] });
    void qc.invalidateQueries({ queryKey: ['recap'] });
  };
  return {
    create: useMutation({ mutationFn: (b: CreateOfficerRequest) => api.post<OfficerDto>(`/spm/${year}/officers`, b), onSuccess: done }),
    update: useMutation({ mutationFn: ({ id, ...b }: UpdateOfficerRequest & { id: string }) => api.patch<OfficerDto>(`/spm/${year}/officers/${id}`, b), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => api.del(`/spm/${year}/officers/${id}`), onSuccess: done }),
    fromVolunteer: useMutation({
      mutationFn: ({ volunteerId, ...b }: { volunteerId: string; dutyKelurahanId?: string }) => api.post<OfficerDto>(`/spm/${year}/officers/from-volunteer/${volunteerId}`, b),
      onSuccess: done,
    }),
  };
}
