import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardScreen } from '../screens/DashboardScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardScreen />
    </QueryClientProvider>
  );
}
