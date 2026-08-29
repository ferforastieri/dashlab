import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { defineConfig, type Plugin, type Rollup } from 'vite';
import { DocsPage } from './landing/docs/DocsPage';
import { LandingPage } from './landing/LandingPage';

const rootMarker = '<div id="root"></div>';
const workerVersionMarker = '__DASHLAB_BUILD_VERSION__';
const rawBuildVersion =
  process.env.VITE_BUILD_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  'development';
const buildVersion = /^[a-zA-Z0-9._-]{7,64}$/.test(rawBuildVersion)
  ? rawBuildVersion
  : 'development';

function moveHtmlEntry(bundle: Rollup.OutputBundle, source: string, target: string) {
  const entry = bundle[source];
  if (!entry) throw new Error(`Vite did not emit ${source}`);
  delete bundle[source];
  entry.fileName = target;
  bundle[target] = entry;
}

function publicRouteAliases(): Plugin {
  let outputDirectory = '';
  const aliases: Record<string, string> = {
    '/': '/landing/index.html',
    '/index.html': '/landing/index.html',
    '/docs': '/landing/docs/index.html',
    '/docs/': '/landing/docs/index.html',
    '/hub': '/lab/index.html',
    '/hub/': '/lab/index.html',
  };

  return {
    name: 'dashlab-plus-pages',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (!request.url) return next();
        const [pathname, query] = request.url.split('?', 2);
        const target = aliases[pathname];
        if (target) request.url = `${target}${query ? `?${query}` : ''}`;
        next();
      });
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const filename = context.filename.replaceAll('\\', '/');
        const render = filename.endsWith('/landing/index.html')
          ? () => renderToString(createElement(LandingPage))
          : filename.endsWith('/landing/docs/index.html')
            ? () => renderToString(createElement(DocsPage))
            : null;
        const versionedHtml = html.replace(
          '<head>',
          `<head>\n    <meta name="dashlab-build-version" content="${buildVersion}" />`,
        );
        if (!render) return versionedHtml;
        if (!html.includes(rootMarker)) throw new Error(`Root marker missing from ${filename}`);
        return versionedHtml.replace(rootMarker, `<div id="root">${render()}</div>`);
      },
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        moveHtmlEntry(bundle, 'landing/index.html', 'index.html');
        moveHtmlEntry(bundle, 'landing/docs/index.html', 'docs/index.html');
        moveHtmlEntry(bundle, 'lab/index.html', 'hub/index.html');
      },
    },
    writeBundle() {
      writeFileSync(
        resolve(outputDirectory, 'version.json'),
        `${JSON.stringify({ version: buildVersion })}\n`,
      );
      const workerPath = resolve(outputDirectory, 'sw.js');
      const worker = readFileSync(workerPath, 'utf8');
      if (!worker.includes(workerVersionMarker)) {
        throw new Error('Service worker build-version marker is missing');
      }
      writeFileSync(workerPath, worker.replaceAll(workerVersionMarker, buildVersion));
    },
  };
}

export default defineConfig({
  plugins: [publicRouteAliases(), react()],
  build: {
    rollupOptions: {
      input: {
        landing: 'landing/index.html',
        docs: 'landing/docs/index.html',
        lab: 'lab/index.html',
      },
    },
  },
  server: { proxy: { '/api': 'http://localhost:3001' } },
});
