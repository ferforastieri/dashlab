import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstallButton({ className = '' }: { className?: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (!installPrompt || window.matchMedia('(display-mode: standalone)').matches) return null;

  return (
    <button
      className={className}
      onClick={async () => {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') setInstallPrompt(null);
      }}
      title="Instalar DashLab"
      aria-label="Instalar DashLab neste dispositivo"
    >
      <Download />
    </button>
  );
}
