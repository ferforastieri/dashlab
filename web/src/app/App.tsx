import { useState } from 'react';
import { clearSession, isAuthenticated } from '../api/core/apiClient';
import { ToastHost } from '../components/ui/ToastHost';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

export function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  function logout() {
    clearSession();
    setAuthenticated(false);
  }

  return (
    <>
      <ToastHost />
      {authenticated ? (
        <DashboardPage onLogout={logout} />
      ) : (
        <LoginPage onAuthenticated={() => setAuthenticated(true)} />
      )}
    </>
  );
}
