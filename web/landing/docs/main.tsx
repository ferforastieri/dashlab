import { createRoot, hydrateRoot } from 'react-dom/client';
import { registerPwa } from '../../shared/registerPwa';
import { DocsPage } from './DocsPage';

registerPwa();

const root = document.getElementById('root')!;
if (root.hasChildNodes()) {
  hydrateRoot(root, <DocsPage />);
} else {
  createRoot(root).render(<DocsPage />);
}
