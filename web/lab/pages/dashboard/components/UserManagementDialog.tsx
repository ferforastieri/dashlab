import { FormEvent, useEffect, useState } from 'react';
import { Trash2, UserPlus, Users, X } from 'lucide-react';
import { apiClient, showToast } from '../../../api/core/apiClient';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';

type LabUser = {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
};

export function UserManagementDialog({ close }: { close: () => void }) {
  const [users, setUsers] = useState<LabUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<LabUser['role']>('user');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<LabUser | null>(null);

  async function loadUsers() {
    const response = await apiClient.get<LabUser[]>('/auth/users');
    setUsers(response.data);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await apiClient.post('/auth/users', { username, password, role });
      setUsername('');
      setPassword('');
      setRole('user');
      await loadUsers();
      showToast('Usuário criado com sucesso.');
    } catch {
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!removing || busy) return;
    setBusy(true);
    try {
      await apiClient.delete(`/auth/users/${removing.id}`);
      setUsers((current) => current.filter((user) => user.id !== removing.id));
      setRemoving(null);
      showToast('Usuário removido com sucesso.');
    } catch {
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={close} className="user-management-dialog" labelledBy="users-title">
      <header className="modal-header">
        <div>
          <span className="modal-kicker"><Users size={14} aria-hidden="true" /> ACESSO</span>
          <h2 id="users-title">Usuários</h2>
        </div>
        <button type="button" className="modal-close" onClick={close} aria-label="Fechar">
          <X />
        </button>
      </header>

      {removing ? (
        <section className="user-removal" aria-live="polite">
          <p>Remover o acesso de <strong>{removing.username}</strong>?</p>
          <div className="confirm-dialog-actions">
            <Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>Cancelar</Button>
            <Button variant="danger" onClick={() => void deleteUser()} disabled={busy}>
              {busy ? 'Removendo…' : 'Remover usuário'}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <form className="user-create-form" onSubmit={createUser}>
            <div className="user-form-heading">
              <UserPlus size={16} aria-hidden="true" />
              <strong>Novo usuário</strong>
            </div>
            <div className="responsive-field-row">
              <label>
                Nome de usuário
                <input required minLength={3} maxLength={64} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
              </label>
              <label>
                Permissão
                <Select value={role} onChange={(event) => setRole(event.target.value as LabUser['role'])}>
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </Select>
              </label>
            </div>
            <label>
              Senha
              <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? 'Criando…' : 'Criar usuário'}
            </Button>
          </form>

          <section className="user-list-section" aria-label="Usuários cadastrados">
            <div className="user-list-heading">
              <span>USUÁRIOS CADASTRADOS</span>
              <small>{users.length}</small>
            </div>
            <div className="user-list">
              {users.map((user) => (
                <div className="user-row" key={user.id}>
                  <span className="user-avatar" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
                  <span className="user-copy">
                    <strong>{user.username}</strong>
                    <small>{user.role === 'admin' ? 'Administrador' : 'Usuário'}</small>
                  </span>
                  <button type="button" className="user-remove" onClick={() => setRemoving(user)} aria-label={`Remover ${user.username}`} title="Remover usuário">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Modal>
  );
}
