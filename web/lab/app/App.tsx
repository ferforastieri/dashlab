import { FormEvent, useEffect, useState } from 'react';
import { ToastHost } from '../components/ui/ToastHost';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

export function App() {
  const [state, setState] = useState<{ setup: boolean; authenticated: boolean } | null>(null);
  const [branding, setBranding] = useState({ name: 'DashLab+', logo: '/logo.png' });
  useEffect(() => {
    void fetch('/api/auth/status').then((r) => r.json()).then(setState).catch(() => setState({ setup: false, authenticated: false }));
    void fetch('/api/auth/branding').then((r) => r.ok ? r.json() : null).then((value) => {
      if (value?.name && value?.logo) setBranding({ name: value.name, logo: value.logo });
    }).catch(() => undefined);
  }, []);
  if (!state) return null;
  if (!state.authenticated) return <AccessForm setup={state.setup} branding={branding} onDone={() => window.location.reload()} />;
  return <><ToastHost /><DashboardPage /></>;
}

function AccessForm({ setup, branding, onDone }: { setup: boolean; branding: { name: string; logo: string }; onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const response = await fetch(setup ? '/api/auth/bootstrap' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!response.ok) {
        setError(setup ? 'Não foi possível criar o administrador.' : 'Usuário ou senha inválidos.');
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="access-screen">
      <div className="access-glow" aria-hidden="true" />
      <form onSubmit={submit} className="access-card">
        <div className="access-brand">
          <span className="access-logo"><img src={branding.logo} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/logo.png'; }} /></span>
          <span><small>WORKSPACE</small><strong>{branding.name}</strong></span>
        </div>
        <div className="access-heading">
          <span>{setup ? 'PRIMEIRA CONFIGURAÇÃO' : 'ACESSO RESTRITO'}</span>
          <h1>{setup ? 'Crie o administrador' : 'Entrar no Lab'}</h1>
          <p>{setup ? 'Este será o primeiro usuário e terá permissão de administrador.' : 'Use suas credenciais para acessar o workspace.'}</p>
        </div>
        <label>Usuário<input required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
        <label>Senha<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={setup ? 'new-password' : 'current-password'} /></label>
        {error && <p className="access-error" role="alert">{error}</p>}
        <button type="submit" className="access-submit" disabled={busy}>{busy ? 'Aguarde…' : setup ? 'Criar administrador' : 'Entrar'}</button>
      </form>
    </main>
  );
}
