import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';

export interface Region {
  id: string;
  code: string;
  name: string;
  level: 'kecamatan' | 'kelurahan';
  parentId: string | null;
}

export function useKelurahan() {
  return useQuery({
    queryKey: ['regions', 'kelurahan'],
    queryFn: ({ signal }) =>
      api.get<{ items: Region[] }>('/regions?level=kelurahan', signal).then((r) => r.items),
    staleTime: 10 * 60_000,
  });
}
