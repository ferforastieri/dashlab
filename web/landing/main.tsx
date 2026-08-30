import { createRoot, hydrateRoot } from 'react-dom/client';
import { LandingPage } from './LandingPage';

const root = document.getElementById('root')!;
if (root.hasChildNodes()) {
  hydrateRoot(root, <LandingPage />);
} else {
  createRoot(root).render(<LandingPage />);
}
