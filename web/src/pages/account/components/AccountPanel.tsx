import { useState } from 'react';
import { clearSession } from '../../../api/core/apiClient';
import { useChangePasswordMutation } from '../../../api/auth/useChangePasswordMutation';
import { useDeleteAccountMutation } from '../../../api/auth/useDeleteAccountMutation';
import { useLogoutAllMutation } from '../../../api/auth/useLogoutAllMutation';
import { useRevokeSessionMutation } from '../../../api/auth/useRevokeSessionMutation';
import { useSessionsQuery } from '../../../api/auth/useSessionsQuery';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { TextField } from '../../../components/ui/TextField';

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sessionsQuery = useSessionsQuery();
  const changePasswordMutation = useChangePasswordMutation();
  const logoutAllMutation = useLogoutAllMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const revokeSessionMutation = useRevokeSessionMutation();
  const sessions = (sessionsQuery.data || []) as Array<{ id: string; createdAt: string }>;

  async function changePassword() {
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      window.setTimeout(() => { clearSession(); location.reload(); }, 900);
    } catch {}
  }

  async function logoutAll() {
    await logoutAllMutation.mutateAsync();
    location.reload();
  }

  async function deleteAccount() {
    try {
      await deleteAccountMutation.mutateAsync(currentPassword);
      window.setTimeout(() => location.reload(), 900);
    } catch {}
  }

  return (
    <>
      <div className="account-panel">
        <TextField label="Senha atual" name="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <TextField label="Nova senha" name="newPassword" type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <Button onClick={changePassword}>Alterar senha</Button>
        <h3>Sessões ativas ({sessions.length})</h3>
        {sessions.map((session) => (
          <div className="account-session" key={session.id}>
            <span>{new Date(session.createdAt).toLocaleString('pt-BR')}</span>
            <Button variant="link" onClick={() => revokeSessionMutation.mutate(session.id)}>Revogar</Button>
          </div>
        ))}
        <Button variant="secondary" onClick={logoutAll}>Encerrar todas as sessões</Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>Excluir minha conta</Button>
        <Button variant="link" onClick={onClose}>Fechar</Button>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title="Excluir conta"
          message="Todo o dashboard, aplicativos, widgets e imagens serão excluídos permanentemente."
          confirmLabel="Excluir permanentemente"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { setConfirmDelete(false); deleteAccount(); }}
        />
      )}
    </>
  );
}
