import { useDashboardQuery } from '../../api/dashboard/useDashboardQuery';
import { DashboardView } from './components/DashboardView';

export function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const dashboardQuery = useDashboardQuery();
  return <DashboardView dashboardQuery={dashboardQuery} onLogout={onLogout} />;
}
