import type {
  AddAffectedRequest,
  AffectedDto,
  CreateEventRequest,
  EventDto,
  EventOfficerDto,
  EventOfficerRequest,
  UpdateAffectedRequest,
} from '@etangguh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

/** Isian `datetime-local` dianggap WITA (UTC+8), zona waktu Banjarmasin. */
export const witaToIso = (v: string) => (v ? `${v.length === 16 ? `${v}:00` : v}+08:00` : '');
export const isoToWita = (iso: string) =>
  new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');

export function useEvents(year: number | null) {
  return useQuery({
    queryKey: ['events', year],
    enabled: year !== null,
    queryFn: ({ signal }) =>
      api.get<{ items: EventDto[] }>(`/spm/${year}/events`, signal).then((r) => r.items),
  });
}
export function useEvent(year: number | null, id: string | undefined) {
  return useQuery({
    queryKey: ['event', year, id],
    enabled: year !== null && !!id,
    queryFn: ({ signal }) => api.get<EventDto>(`/spm/${year}/events/${id}`, signal),
  });
}
export function useAffected(year: number | null, id: string | undefined) {
  return useQuery({
    queryKey: ['affected', year, id],
    enabled: year !== null && !!id,
    queryFn: ({ signal }) =>
      api
        .get<{ items: AffectedDto[] }>(`/spm/${year}/events/${id}/affected`, signal)
        .then((r) => r.items),
  });
}
export function useEventOfficers(year: number | null, id: string | undefined) {
  return useQuery({
    queryKey: ['event-officers', year, id],
    enabled: year !== null && !!id,
    queryFn: ({ signal }) =>
      api
        .get<{ items: EventOfficerDto[] }>(`/spm/${year}/events/${id}/officers`, signal)
        .then((r) => r.items),
  });
}

export function useEventMutations(year: number | null, id?: string) {
  const qc = useQueryClient();
  const done = () => {
    for (const k of ['events', 'event', 'affected', 'event-officers'])
      void qc.invalidateQueries({ queryKey: [k] });
  };
  return {
    create: useMutation({
      mutationFn: (b: CreateEventRequest) => api.post<EventDto>(`/spm/${year}/events`, b),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (b: Partial<CreateEventRequest>) =>
        api.patch<EventDto>(`/spm/${year}/events/${id}`, b),
      onSuccess: done,
    }),
    addAffected: useMutation({
      mutationFn: (b: AddAffectedRequest) => api.post(`/spm/${year}/events/${id}/affected`, b),
      onSuccess: done,
    }),
    updateAffected: useMutation({
      mutationFn: ({ personId, ...b }: UpdateAffectedRequest & { personId: string }) =>
        api.patch(`/spm/${year}/events/${id}/affected/${personId}`, b),
      onSuccess: done,
    }),
    putOfficer: useMutation({
      mutationFn: ({ officerId, ...b }: EventOfficerRequest & { officerId: string }) =>
        api.put(`/spm/${year}/events/${id}/officers/${officerId}`, b),
      onSuccess: done,
    }),
    removeOfficer: useMutation({
      mutationFn: (officerId: string) => api.del(`/spm/${year}/events/${id}/officers/${officerId}`),
      onSuccess: done,
    }),
  };
}
