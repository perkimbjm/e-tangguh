import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export type InventoryKind = 'equipment' | 'logistics';
export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  locationText: string | null;
  institution: string | null;
  qtyGood: number;
  qtyBroken: number;
} & Record<string, unknown>;

export function useInventory(kind: InventoryKind, year: number | null) {
  return useQuery({
    queryKey: ['inventory', kind, year],
    enabled: year !== null,
    queryFn: ({ signal }) =>
      api.get<{ items: InventoryItem[] }>(`/spm/${year}/${kind}`, signal).then((r) => r.items),
  });
}

export function useInventoryMutations(kind: InventoryKind, year: number | null) {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ['inventory', kind] });
  return {
    create: useMutation({
      mutationFn: (b: Record<string, unknown>) => api.post(`/spm/${year}/${kind}`, b),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/spm/${year}/${kind}/${id}`),
      onSuccess: done,
    }),
  };
}
