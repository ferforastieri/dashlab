import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/apiClient';
export const useWeatherQuery = (latitude: number, longitude: number, enabled: boolean) =>
  useQuery({
    queryKey: ['weather', latitude, longitude],
    queryFn: async () =>
      (await apiClient.get(`/weather?latitude=${latitude}&longitude=${longitude}`)).data,
    enabled,
    staleTime: 600000,
  });
