import { createRoot, hydrateRoot } from 'react-dom/client';
import { registerPwa } from '../shared/registerPwa';
import { LandingPage } from './LandingPage';

registerPwa();

const root = document.getElementById('root')!;
if (root.hasChildNodes()) {
  hydrateRoot(root, <LandingPage />);
} else {
  createRoot(root).render(<LandingPage />);
}
