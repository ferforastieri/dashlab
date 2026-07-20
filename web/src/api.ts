const base = "/api";
let access = localStorage.getItem("dashlab_access") || "";
const refresh = () => localStorage.getItem("dashlab_refresh") || "";
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
  if (!r.ok) throw new Error(d.message || "Não foi possível continuar");
  access = d.accessToken;
  localStorage.setItem("dashlab_access", d.accessToken);
  localStorage.setItem("dashlab_refresh", d.refreshToken);
  return d;
}
export async function api(path: string, options: RequestInit = {}) {
  let r = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
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
          "content-type": "application/json",
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
    throw new Error(d.message || "Erro inesperado");
  }
  return r.status === 204 ? null : r.json();
}
