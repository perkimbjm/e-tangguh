import type { OfficerCardDto } from '@etangguh/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export function useOfficerCards(year: number | null) {
  return useQuery({
    queryKey: ['officer-cards', year],
    enabled: year !== null,
    queryFn: ({ signal }) =>
      api
        .get<{ items: OfficerCardDto[] }>(`/spm/${year}/officers/cards`, signal)
        .then((r) => r.items),
  });
}

export function useOfficerCard(year: number | null, id: string | undefined) {
  return useQuery({
    queryKey: ['officer-card', year, id],
    enabled: year !== null && !!id,
    queryFn: ({ signal }) => api.get<OfficerCardDto>(`/spm/${year}/officers/${id}/card`, signal),
  });
}

/** Pita kesiapan; selalu ditampilkan bersama teksnya (warna bukan satu-satunya penanda). */
export function readinessBand(overall: number) {
  if (overall >= 75)
    return {
      label: 'Kesiapan tinggi',
      ring: 'from-amber-300 via-yellow-200 to-amber-500',
      chip: 'bg-amber-300 text-amber-950',
    };
  if (overall >= 50)
    return {
      label: 'Kesiapan menengah',
      ring: 'from-slate-200 via-white to-slate-400',
      chip: 'bg-slate-200 text-slate-900',
    };
  return {
    label: 'Kesiapan awal',
    ring: 'from-orange-300 via-orange-200 to-orange-500',
    chip: 'bg-orange-200 text-orange-950',
  };
}
