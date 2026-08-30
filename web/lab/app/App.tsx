import { useEffect, useState } from 'react';
import { ToastHost } from '../components/ui/ToastHost';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

export function App() {
  const [state, setState] = useState<{ setup: boolean; authenticated: boolean } | null>(null);
  useEffect(() => { void fetch('/api/auth/status').then((r) => r.json()).then(setState).catch(() => setState({ setup: false, authenticated: false })); }, []);
  if (!state) return null;
  if (!state.authenticated) return <AccessForm setup={state.setup} onDone={() => window.location.reload()} />;
  return <><ToastHost /><DashboardPage /></>;
}

function AccessForm({ setup, onDone }: { setup: boolean; onDone: () => void }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(''); const response = await fetch(setup ? '/api/auth/bootstrap' : '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) }); if (!response.ok) { setError(setup ? 'Não foi possível criar o administrador.' : 'Usuário ou senha inválidos.'); return; } onDone(); }
  return <main className="grid min-h-screen place-items-center bg-[#101416] p-6 text-[#e7eaec]"><form onSubmit={submit} className="grid w-full max-w-sm gap-4 rounded border border-[#343b3f] bg-[#181d20] p-7"><h1 className="m-0 text-xl">{setup ? 'Crie o administrador' : 'Entrar no DashLab+'}</h1><p className="m-0 text-sm text-[#b4bec3]">{setup ? 'Este será o primeiro usuário e terá permissão de administrador.' : 'Use suas credenciais para acessar o Lab.'}</p><label>Usuário<input required minLength={3} value={username} onChange={(e)=>setUsername(e.target.value)} className="mt-1 block w-full rounded border border-[#343b3f] bg-[#101416] p-3" /></label><label>Senha<input required type="password" minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 block w-full rounded border border-[#343b3f] bg-[#101416] p-3" /></label>{error && <p className="m-0 text-sm text-red-300">{error}</p>}<button className="rounded bg-[#ff7a1a] p-3 font-semibold text-[#101416]">{setup ? 'Criar administrador' : 'Entrar'}</button></form></main>;
}
