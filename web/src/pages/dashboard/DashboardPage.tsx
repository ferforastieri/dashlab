import { useDashboardQuery } from '../../api/dashboard/useDashboardQuery';
import { DashboardView } from './components/DashboardView';

export function DashboardPage() {
  const dashboardQuery = useDashboardQuery();
  return <DashboardView dashboardQuery={dashboardQuery} />;
}
