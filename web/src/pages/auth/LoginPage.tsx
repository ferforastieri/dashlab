import { FormEvent, useState } from 'react';
import { useLoginMutation } from '../../api/auth/useLoginMutation';
import { useRegisterMutation } from '../../api/auth/useRegisterMutation';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const mutation = isRegistering ? registerMutation : loginMutation;
      await mutation.mutateAsync({ username, password });
      onAuthenticated();
    } catch {
      setError('Não foi possível autenticar com os dados informados.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-mark">D</div>
        <h1 id="auth-title">DashLab</h1>
        <p>{isRegistering ? 'Crie seu espaço pessoal' : 'Seu homelab, do seu jeito.'}</p>
        <form onSubmit={handleSubmit}>
          <TextField
            name="username"
            label="Usuário"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoCapitalize="none"
            required
            minLength={3}
          />
          <TextField
            name="password"
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Aguarde…' : isRegistering ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>
        <Button variant="link" onClick={() => setIsRegistering((value) => !value)}>
          {isRegistering ? 'Já tenho uma conta' : 'Criar uma conta'}
        </Button>
      </section>
    </main>
  );
}
