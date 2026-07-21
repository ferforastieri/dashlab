import { ApplicationShell } from '../components/ui/ApplicationShell';
import { useDashboard } from '../api/dashboard/useDashboard';

export function DashboardPage() {
  const dashboardQuery = useDashboard();
  return <ApplicationShell dashboardQuery={dashboardQuery} />;
}
