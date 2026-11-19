import type {
  ApprovalStatus,
  CompletenessRow,
  CreateResidentRequest,
  Paged,
  ResidentDetail,
  ResidentListItem,
} from '@etangguh/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export interface ResidentFilters {
  kelurahan?: string;
  rw?: string;
  rt?: string;
  status?: ApprovalStatus | '';
  q?: string;
  nik?: string;
  batch?: string;
}

function qs(params: Record<string, string | number | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
}

export function useResidents(year: number | null, filters: ResidentFilters) {
  return useInfiniteQuery({
    queryKey: ['residents', year, filters],
    enabled: year !== null,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<Paged<ResidentListItem>>(`/spm/${year}/residents${qs({ ...filters, cursor: pageParam, limit: 50 })}`, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useResidentDetail(year: number | null, id: string | null) {
  return useQuery({
    queryKey: ['resident', year, id],
    enabled: year !== null && id !== null,
    queryFn: ({ signal }) => api.get<ResidentDetail>(`/spm/${year}/residents/${id}`, signal),
    // Rincian berisi NIK utuh: jangan disimpan lama di memori.
    gcTime: 0,
    staleTime: 0,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['residents'] });
    void qc.invalidateQueries({ queryKey: ['completeness'] });
  };
}

export function useCreateResident(year: number | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: CreateResidentRequest) =>
      api.post<{ id: string; approvalStatus: ApprovalStatus; duplicateCandidates: { id: string; fullName: string; score: number }[] }>(`/spm/${year}/residents`, body),
    onSuccess: invalidate,
  });
}

export function useUpdateResident(year: number | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; rowVersion: number } & Record<string, unknown>) => api.patch(`/spm/${year}/residents/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeactivateResident(year: number | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; reason: string; date: string; rowVersion: number }) => api.post(`/spm/${year}/residents/${id}/deactivate`, body),
    onSuccess: invalidate,
  });
}

export function useApprove(year: number | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { batchId?: string; kelurahanId?: string; ids?: string[] }) => api.post<{ approved: number }>(`/spm/${year}/residents/approve`, body),
    onSuccess: invalidate,
  });
}

export function useReturn(year: number | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { ids: string[]; note: string }) => api.post<{ returned: number }>(`/spm/${year}/residents/return`, body),
    onSuccess: invalidate,
  });
}

export function useCompleteness(year: number | null) {
  return useQuery({
    queryKey: ['completeness', year],
    enabled: year !== null,
    queryFn: ({ signal }) => api.get<{ items: CompletenessRow[] }>(`/spm/${year}/completeness`, signal).then((r) => r.items),
  });
}
