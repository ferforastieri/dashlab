import { PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{
  onClose?: () => void;
  className?: string;
  labelledBy?: string;
}>;

export function Modal({ children, onClose, className = '', labelledBy }: ModalProps) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <section
        className={`modal-panel ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </section>
    </div>
  );
}
