import { PropsWithChildren, useEffect, useRef, useState } from 'react';

type ModalProps = PropsWithChildren<{
  onClose?: () => void;
  className?: string;
  labelledBy?: string;
}>;

export function Modal({ children, onClose, className = '', labelledBy }: ModalProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
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
        className={`modal-panel ${expanded ? 'is-expanded' : ''} ${className}`.trim()}
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
          const dy = touch.clientY - start.y;
          if (Math.abs(dy) < 70 || Math.abs(dy) <= Math.abs(touch.clientX - start.x)) return;
          if (dy < 0) setExpanded(true);
          else if (expanded) setExpanded(false);
          else onClose?.();
        }}
      >
        {children}
      </section>
    </div>
  );
}
