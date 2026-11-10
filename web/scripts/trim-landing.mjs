import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');

await rm(resolve(dist, 'lab'), { recursive: true, force: true });
await rm(resolve(dist, 'lab.webmanifest'), { force: true });

const assets = resolve(dist, 'assets');
for (const file of await readdir(assets)) {
  if (file.startsWith('lab-')) {
    await rm(resolve(assets, file), { force: true });
  }
}

const serviceWorker = resolve(dist, 'sw.js');
const source = await readFile(serviceWorker, 'utf8');
const trimmed = source
  .replace(/^\s*'\.\/lab\/',\n/m, '')
  .replace(/^\s*'\.\/lab\.webmanifest',\n/m, '')
  .replaceAll("caches.match('./lab/')", "caches.match('./')");

await writeFile(serviceWorker, trimmed);
