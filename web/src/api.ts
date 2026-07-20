const base = "/api";
let access = localStorage.getItem("dashlab_access") || "";
const refresh = () => localStorage.getItem("dashlab_refresh") || "";
function notify(message: string, type: 'success'|'error' = 'success') {
  window.dispatchEvent(new CustomEvent('dashlab:toast',{detail:{message,type}}));
}
export function isLogged() {
  return !!access;
}
export function clearAuth() {
  access = "";
  localStorage.removeItem("dashlab_access");
  localStorage.removeItem("dashlab_refresh");
}
export async function auth(path: string, body: any) {
  const r = await fetch(`${base}/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) { notify(Array.isArray(d.message)?d.message[0]:d.message || "Não foi possível continuar",'error'); throw new Error(d.message || "Não foi possível continuar"); }
  access = d.accessToken;
  localStorage.setItem("dashlab_access", d.accessToken);
  localStorage.setItem("dashlab_refresh", d.refreshToken);
  if (path !== 'refresh' && d.message) notify(d.message);
  return d;
}
export async function api(path: string, options: RequestInit = {}) {
  const isForm = options.body instanceof FormData;
  let r = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { "content-type": "application/json" }),
      authorization: `Bearer ${access}`,
      ...options.headers,
    },
  });
  if (r.status === 401 && refresh()) {
    try {
      await auth("refresh", { refreshToken: refresh() });
      r = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          ...(isForm ? {} : { "content-type": "application/json" }),
          authorization: `Bearer ${access}`,
          ...options.headers,
        },
      });
    } catch {
      clearAuth();
      location.reload();
    }
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    if ((options.method || 'GET').toUpperCase() !== 'GET') notify(Array.isArray(d.message)?d.message[0]:d.message || 'Erro inesperado','error');
    throw new Error(d.message || "Erro inesperado");
  }
  if (r.status === 204) return null;
  const data = await r.json();
  if ((options.method || 'GET').toUpperCase() !== 'GET' && data?.message) notify(data.message);
  return data;
}
