import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
export const useUploadAssetMutation = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return (await apiClient.post('/assets', body)).data;
    },
  });
