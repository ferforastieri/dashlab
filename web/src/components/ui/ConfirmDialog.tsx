import { Button } from './Button';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
};

export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm, danger = false }: ConfirmDialogProps) {
  return (
    <Modal className="confirm-dialog z-40" labelledBy="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
    </Modal>
  );
}
