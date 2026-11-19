import type { ImportPreview } from '@etangguh/shared';
import { useMutation } from '@tanstack/react-query';
import { api, apiFetch } from '../../../lib/api-client';

export const templateUrl = (formCode: string, year: number | null) =>
  `/api/v1/spm/templates/${formCode}${year ? `?ta=${year}` : ''}`;
export const errorsUrl = (year: number, id: string) =>
  `/api/v1/spm/${year}/imports/${id}/errors.xlsx`;

export function useUploadImport(year: number | null) {
  return useMutation({
    mutationFn: ({ file, formCode }: { file: File; formCode: string }) => {
      const body = new FormData();
      body.set('formCode', formCode);
      body.set('file', file);
      return apiFetch<ImportPreview>(`/spm/${year}/imports`, { method: 'POST', body });
    },
  });
}

export function useImportAction(year: number | null) {
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: 'confirm' | 'cancel' | 'region-mapping';
      body?: unknown;
    }) => api.post<ImportPreview>(`/spm/${year}/imports/${id}/${action}`, body),
  });
}
