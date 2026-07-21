import { Check, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

type Toast = { id: number; message: string; type: 'success' | 'error' };

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Omit<Toast, 'id'>>).detail;
      const id = Date.now() + Math.random();
      setItems((current) => [...current, { id, ...detail }]);
      window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3500);
    };
    window.addEventListener('dashlab:toast', handler);
    return () => window.removeEventListener('dashlab:toast', handler);
  }, []);

  return (
    <div className="toast-stack">
      {items.map((item) => (
        <div
          className={`system-toast ${item.type === 'error' ? 'system-toast-error' : ''}`}
          key={item.id}
          role={item.type === 'error' ? 'alert' : 'status'}
        >
          <span className="toast-icon" aria-hidden="true">
            {item.type === 'error' ? <TriangleAlert /> : <Check />}
          </span>
          <span className="toast-copy">
            <small>{item.type === 'error' ? 'AÇÃO INTERROMPIDA' : 'ALTERAÇÃO REGISTRADA'}</small>
            {item.message}
          </span>
        </div>
      ))}
    </div>
  );
}
