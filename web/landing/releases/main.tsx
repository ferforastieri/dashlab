import { createRoot, hydrateRoot } from 'react-dom/client';
import { ReleasesPage } from './ReleasesPage';
import { registerPwa } from '../../shared/registerPwa';

registerPwa();

const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, <ReleasesPage />);
else createRoot(root).render(<ReleasesPage />);
