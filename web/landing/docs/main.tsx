import { createRoot, hydrateRoot } from 'react-dom/client';
import { DocsPage } from './DocsPage';

const root = document.getElementById('root')!;
if (root.hasChildNodes()) {
  hydrateRoot(root, <DocsPage />);
} else {
  createRoot(root).render(<DocsPage />);
}
