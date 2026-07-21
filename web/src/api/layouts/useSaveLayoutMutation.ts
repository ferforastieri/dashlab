import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
export const useSaveLayoutMutation = () => {
  return useMutation({
    scope: { id: 'web-layout-save' },
    mutationFn: async (items: any[]) => (
      await apiClient.put('/layouts/web', { items }, { headers: { 'X-Silent-Toast': 'true' } })
    ).data,
  });
};
