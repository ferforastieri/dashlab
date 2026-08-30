import { PropsWithChildren, useEffect, useRef } from 'react';

type ModalProps = PropsWithChildren<{
  onClose?: () => void;
  className?: string;
  labelledBy?: string;
}>;

export function Modal({ children, onClose, className = '', labelledBy }: ModalProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

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
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start) return;
          const touch = event.changedTouches[0];
          if (touch.clientY - start.y > 90 && Math.abs(touch.clientY - start.y) > Math.abs(touch.clientX - start.x)) onClose?.();
        }}
      >
        {children}
      </section>
    </div>
  );
}
