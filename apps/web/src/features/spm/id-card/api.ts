import type { IdCardDto, IdCardSettings, IdCardVerification, PhotoFrame } from '@etangguh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, apiFetch } from '../../../lib/api-client';

export function useIdCard(year: number | null, id: string | undefined) {
  return useQuery({
    queryKey: ['id-card', year, id],
    enabled: year !== null && !!id,
    queryFn: ({ signal }) => api.get<IdCardDto>(`/spm/${year}/officers/${id}/id-card`, signal),
  });
}

/** Foto diambil sebagai blob (sesi + otorisasi server), ditampilkan lewat URL objek sementara. */
export function usePhotoUrl(
  year: number | null,
  id: string | undefined,
  hasPhoto: boolean | undefined,
  version: number,
) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!year || !id || !hasPhoto) {
      setUrl(null);
      return;
    }
    let revoked: string | null = null;
    const ctrl = new AbortController();
    fetch(`/api/v1/spm/${year}/officers/${id}/photo`, {
      credentials: 'same-origin',
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b) {
          revoked = URL.createObjectURL(b);
          setUrl(revoked);
        }
      })
      .catch(() => undefined);
    return () => {
      ctrl.abort();
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [year, id, hasPhoto, version]);
  return url;
}

export function usePhotoMutations(year: number | null, id: string | undefined) {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ['id-card', year, id] });
  return {
    upload: useMutation({
      mutationFn: (blob: Blob) => {
        const body = new FormData();
        body.set('photo', blob, 'foto.webp');
        return apiFetch(`/spm/${year}/officers/${id}/photo`, { method: 'POST', body });
      },
      onSuccess: done,
    }),
    frame: useMutation({
      mutationFn: (f: PhotoFrame) =>
        api.put<PhotoFrame>(`/spm/${year}/officers/${id}/photo-frame`, f),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: () => api.del(`/spm/${year}/officers/${id}/photo`),
      onSuccess: done,
    }),
  };
}

export function useIdCardSettings() {
  return useQuery({
    queryKey: ['id-card-settings'],
    queryFn: ({ signal }) => api.get<IdCardSettings>('/spm/id-card/settings', signal),
  });
}

export function useSaveIdCardSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: IdCardSettings) => api.put<IdCardSettings>('/spm/id-card/settings', b),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['id-card-settings'] });
      void qc.invalidateQueries({ queryKey: ['id-card'] });
    },
  });
}

export function useVerification(code: string | undefined) {
  return useQuery({
    queryKey: ['verify', code],
    enabled: !!code,
    retry: false,
    queryFn: ({ signal }) => api.get<IdCardVerification>(`/public/verify/${code}`, signal),
  });
}
