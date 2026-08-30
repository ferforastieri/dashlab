package app

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func testServer(t *testing.T) (*Server, http.Handler) {
	t.Helper()
	store, err := OpenStore(filepath.Join(t.TempDir(), "dashlab-plus.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	integrations := NewIntegrations()
	integrations.allowlist = parseAllowlist("proxmox.local")
	if err := store.ensureUsers(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err := store.createUser(t.Context(), "test", "test-password", "admin"); err != nil {
		t.Fatal(err)
	}
	server := &Server{store: store, integrations: integrations, logger: slog.New(slog.NewTextHandler(&bytes.Buffer{}, nil)), outboundAllowlist: parseAllowlist("proxmox.local"), sessions: make(map[string]authIdentity)}
	return server, server.routes()
}

func requestJSON(t *testing.T, handler http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var payload bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	request := httptest.NewRequest(method, path, &payload)
	request.Header.Set("Content-Type", "application/json")
	request.SetBasicAuth("test", "test-password")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func TestDashboardStartsWithSingleUserDefaults(t *testing.T) {
	_, handler := testServer(t)
	response := requestJSON(t, handler, http.MethodGet, "/api/dashboard?surface=web", nil)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	body := response.Body.Bytes()
	var dashboard Dashboard
	if err := json.Unmarshal(body, &dashboard); err != nil {
		t.Fatal(err)
	}
	if dashboard.ID != "dashlab-plus-local" {
		t.Fatalf("dashboard id = %q", dashboard.ID)
	}
	if len(dashboard.Widgets) != 3 {
		t.Fatalf("widgets = %d", len(dashboard.Widgets))
	}
	if len(dashboard.Layouts) == 0 {
		t.Fatal("expected seeded web layouts")
	}
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"applications", "sections", "widgets", "layouts"} {
		if raw[field] == nil {
			t.Fatalf("%s must be a JSON array, got null", field)
		}
		if _, ok := raw[field].([]any); !ok {
			t.Fatalf("%s must be a JSON array, got %T", field, raw[field])
		}
	}
}

func TestAPIRequiresBasicAuthentication(t *testing.T) {
	_, handler := testServer(t)
	request := httptest.NewRequest(http.MethodGet, "/api/dashboard", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestBasicLoginCreatesReusableSession(t *testing.T) {
	_, handler := testServer(t)
	login := httptest.NewRequest(http.MethodGet, "/api/dashboard", nil)
	login.SetBasicAuth("test", "test-password")
	first := httptest.NewRecorder()
	handler.ServeHTTP(first, login)
	if first.Code != http.StatusOK || len(first.Result().Cookies()) != 1 {
		t.Fatalf("login status = %d, cookies = %d", first.Code, len(first.Result().Cookies()))
	}
	followUp := httptest.NewRequest(http.MethodGet, "/api/dashboard", nil)
	followUp.AddCookie(first.Result().Cookies()[0])
	second := httptest.NewRecorder()
	handler.ServeHTTP(second, followUp)
	if second.Code != http.StatusOK {
		t.Fatalf("session status = %d, body = %s", second.Code, second.Body.String())
	}
}

func TestMutatingRequestsRejectCrossOrigin(t *testing.T) {
	_, handler := testServer(t)
	request := httptest.NewRequest(http.MethodPost, "/api/update", nil)
	request.SetBasicAuth("test", "test-password")
	request.Header.Set("Origin", "https://evil.example")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestOutboundURLBlocksPrivateDestinationsUnlessAllowlisted(t *testing.T) {
	if outboundURLAllowed("http://127.0.0.1:9090", nil) {
		t.Fatal("loopback URL must be blocked")
	}
	if !outboundURLAllowed("http://127.0.0.1:9090", parseAllowlist("127.0.0.1")) {
		t.Fatal("explicitly allowlisted loopback URL must be accepted")
	}
}

func TestVersionEndpointIsNotCached(t *testing.T) {
	_, handler := testServer(t)
	response := requestJSON(t, handler, http.MethodGet, "/api/version", nil)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("cache control = %q", response.Header().Get("Cache-Control"))
	}
	var payload map[string]string
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload["version"] != BuildVersion {
		t.Fatalf("version = %q", payload["version"])
	}
}

func TestApplicationLifecyclePersistsInSQLite(t *testing.T) {
	server, handler := testServer(t)
	created := requestJSON(t, handler, http.MethodPost, "/api/applications", map[string]any{"name": "Proxmox", "url": "https://proxmox.local"})
	if created.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", created.Code, created.Body.String())
	}
	var application Application
	if err := json.NewDecoder(created.Body).Decode(&application); err != nil {
		t.Fatal(err)
	}
	if application.ID == "" || !application.Visible {
		t.Fatalf("invalid application: %#v", application)
	}

	dashboard, err := server.store.Dashboard(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if findApplication(dashboard.Applications, application.ID) < 0 {
		t.Fatal("application was not persisted")
	}
	if len(filterLayouts(dashboard.Layouts, func(layout Layout) bool { return layout.ApplicationID == application.ID })) != 2 {
		t.Fatal("desktop and mobile layouts were not created")
	}

	deleted := requestJSON(t, handler, http.MethodDelete, "/api/applications/"+application.ID, nil)
	if deleted.Code != http.StatusOK {
		t.Fatalf("delete status = %d", deleted.Code)
	}
	dashboard, _ = server.store.Dashboard(t.Context())
	if findApplication(dashboard.Applications, application.ID) >= 0 {
		t.Fatal("application was not deleted")
	}
}

func TestPwaManifestUsesStableSingleUserPath(t *testing.T) {
	_, handler := testServer(t)
	response := requestJSON(t, handler, http.MethodGet, "/api/pwa/dashlab-plus-local/manifest.webmanifest", nil)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if contentType := response.Header().Get("Content-Type"); contentType != "application/manifest+json" {
		t.Fatalf("content type = %q", contentType)
	}
	var manifest map[string]any
	if err := json.NewDecoder(response.Body).Decode(&manifest); err != nil {
		t.Fatal(err)
	}
	if manifest["start_url"] != "/pwa/dashlab-plus-local/" {
		t.Fatalf("start_url = %v", manifest["start_url"])
	}
}

func TestInstalledPwaUsesDynamicManifest(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "lab"), 0o755); err != nil {
		t.Fatal(err)
	}
	page := `<link rel="manifest" href="/lab.webmanifest"><div id="root"></div>`
	if err := os.WriteFile(filepath.Join(root, "lab", "index.html"), []byte(page), 0o644); err != nil {
		t.Fatal(err)
	}

	response := requestJSON(t, webHandler(root), http.MethodGet, "/pwa/dashlab-plus-local/", nil)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	expected := `/api/pwa/dashlab-plus-local/manifest.webmanifest`
	if !bytes.Contains(response.Body.Bytes(), []byte(expected)) {
		t.Fatalf("dynamic manifest missing from %q", response.Body.String())
	}
}

func TestSelfHostedRootOpensLab(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "lab"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "lab", "index.html"), []byte("lab"), 0o644); err != nil {
		t.Fatal(err)
	}

	response := requestJSON(t, webHandler(root), http.MethodGet, "/", nil)
	if response.Code != http.StatusFound {
		t.Fatalf("status = %d", response.Code)
	}
	if location := response.Header().Get("Location"); location != "/lab/" {
		t.Fatalf("location = %q", location)
	}
}
