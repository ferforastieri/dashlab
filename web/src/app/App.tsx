import { useEffect, useState } from 'react';
import {
  clearSession,
  hasRefreshToken,
  isAuthenticated,
  refreshSession,
} from '../api/core/apiClient';
import { ToastHost } from '../components/ui/ToastHost';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

export function App() {
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'authenticated' | 'anonymous'>(
    isAuthenticated() ? 'authenticated' : hasRefreshToken() ? 'checking' : 'anonymous',
  );

  useEffect(() => {
    const expireSession = () => setSessionStatus('anonymous');
    window.addEventListener('dashlab:session-expired', expireSession);

    if (sessionStatus === 'checking') {
      refreshSession()
        .then(() => setSessionStatus('authenticated'))
        .catch(() => setSessionStatus('anonymous'));
    }

    return () => window.removeEventListener('dashlab:session-expired', expireSession);
  }, [sessionStatus]);

  function logout() {
    clearSession();
    setSessionStatus('anonymous');
  }

  return (
    <>
      <ToastHost />
      {sessionStatus === 'checking' ? (
        <div className="loading-screen">Verificando sua sessão…</div>
      ) : sessionStatus === 'authenticated' ? (
        <DashboardPage onLogout={logout} />
      ) : (
        <LoginPage onAuthenticated={() => setSessionStatus('authenticated')} />
      )}
    </>
  );
}
