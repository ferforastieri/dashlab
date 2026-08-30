import { createRoot, hydrateRoot } from 'react-dom/client';
import { ReleasesPage } from './ReleasesPage';

const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, <ReleasesPage />);
else createRoot(root).render(<ReleasesPage />);
