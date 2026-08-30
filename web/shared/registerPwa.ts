import './update.css';

const latestVersionUrl = 'https://dashlabplus.vercel.app/version.json';
const checkInterval = 30 * 60 * 1000;

type VersionResponse = { version?: unknown };

function isPublishedVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== 'development' &&
    /^[a-zA-Z0-9._-]{7,64}$/.test(value)
  );
}

async function fetchVersion(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as VersionResponse;
    return isPublishedVersion(payload.version) ? payload.version : null;
  } catch {
    return null;
  }
}

function updateText() {
  const english = document.documentElement.lang.toLowerCase().startsWith('en');
  return english
    ? {
        title: 'Update available',
        browser: 'A new version of DashLab+ is ready.',
        server: 'A new frontend and server version is ready.',
        update: 'Update',
        updating: 'Updating…',
        later: 'Later',
        started: 'Update started. The server will restart and reload automatically.',
        failed: 'Could not start the server update. Try again in a moment.',
      }
    : {
        title: 'Atualização disponível',
        browser: 'Uma nova versão do DashLab+ está pronta.',
        server: 'Uma nova versão da interface e do servidor está pronta.',
        update: 'Atualizar',
        updating: 'Atualizando…',
        later: 'Agora não',
        started: 'Atualização iniciada. O servidor será reiniciado e a página recarregará.',
        failed: 'Não foi possível iniciar a atualização. Tente novamente em instantes.',
      };
}

function showUpdateNotice(
  version: string,
  serverUpdate: boolean,
  registration?: ServiceWorkerRegistration,
) {
  const mode = serverUpdate ? 'server' : 'browser';
  const existingNotice = document.querySelector<HTMLElement>('[data-dashlab-update]');
  if (
    existingNotice?.dataset.updateVersion === version &&
    existingNotice.dataset.updateMode === mode
  )
    return;
  existingNotice?.remove();
  try {
    if (sessionStorage.getItem('dashlab-plus-dismissed-update') === `${version}:${mode}`) return;
  } catch {
    // The notice still works when browser storage is unavailable.
  }

  const text = updateText();
  const notice = document.createElement('aside');
  notice.className = 'dashlab-update';
  notice.dataset.dashlabUpdate = '';
  notice.dataset.updateVersion = version;
  notice.dataset.updateMode = mode;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');

  const copy = document.createElement('div');
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  title.textContent = text.title;
  detail.textContent = serverUpdate ? text.server : text.browser;
  copy.append(title, detail);

  const actions = document.createElement('div');
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'dashlab-update__confirm';
  confirm.textContent = text.update;
  confirm.addEventListener('click', async () => {
    if (serverUpdate) {
      confirm.disabled = true;
      confirm.textContent = text.updating;
      try {
        const response = await fetch('/api/update', {
          method: 'POST',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`update request failed: ${response.status}`);
        detail.textContent = text.started;
        window.setTimeout(() => window.location.reload(), 8000);
      } catch {
        confirm.disabled = false;
        confirm.textContent = text.update;
        detail.textContent = text.failed;
      }
      return;
    }

    confirm.disabled = true;
    const waitingWorker = registration?.waiting;
    if (waitingWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
        once: true,
      });
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      return;
    }
    window.location.reload();
  });

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'dashlab-update__dismiss';
  dismiss.textContent = text.later;
  dismiss.addEventListener('click', () => {
    try {
      sessionStorage.setItem('dashlab-plus-dismissed-update', `${version}:${mode}`);
    } catch {
      // Dismissing the current DOM notice is still useful without storage.
    }
    notice.remove();
  });

  actions.append(confirm, dismiss);
  notice.append(copy, actions);
  document.body.append(notice);
}

export function registerPwa() {
  if (import.meta.env.DEV) return;

  window.addEventListener('load', async () => {
    let registration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => undefined);
    }

    // Remove shell caches created by older workers. Those caches contained the
    // complete HTML shell and could make a normal reload alternate between two
    // deployments while Ctrl+F5 appeared correct.
    try {
      const resetKey = 'dashlab-plus-cache-reset-v2';
      if (!sessionStorage.getItem(resetKey)) {
        const keys = await caches.keys();
        const legacy = keys.filter((key) => key.startsWith('dashlab-plus-shell-'));
        if (legacy.length) {
          await Promise.all(legacy.map((key) => caches.delete(key)));
          sessionStorage.setItem(resetKey, '1');
          window.location.reload();
          return;
        }
        sessionStorage.setItem(resetKey, '1');
      }
    } catch {
      // Cache APIs can be unavailable in private browsing; normal update flow remains active.
    }

    let checking = false;
    const checkForUpdate = async () => {
      if (checking) return;
      checking = true;
      try {
        await registration?.update().catch(() => undefined);
        const serverVersion = await fetchVersion('/api/version');
        const pageVersion = document.querySelector<HTMLMetaElement>(
          'meta[name="dashlab-build-version"]',
        )?.content;
        const latestVersion = await fetchVersion(serverVersion ? latestVersionUrl : '/version.json');
        if (
          isPublishedVersion(pageVersion) &&
          latestVersion &&
          (pageVersion !== latestVersion ||
            (serverVersion !== null && serverVersion !== latestVersion))
        ) {
          showUpdateNotice(
            latestVersion,
            serverVersion !== null && serverVersion !== latestVersion,
            registration,
          );
        }
      } finally {
        checking = false;
      }
    };

    await checkForUpdate();
    window.setInterval(checkForUpdate, checkInterval);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    });
  });
}
