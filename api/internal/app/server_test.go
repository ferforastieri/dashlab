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
	server := &Server{store: store, integrations: NewIntegrations(), logger: slog.New(slog.NewTextHandler(&bytes.Buffer{}, nil))}
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
	if len(dashboard.Widgets) != 6 {
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
	if err := os.MkdirAll(filepath.Join(root, "hub"), 0o755); err != nil {
		t.Fatal(err)
	}
	page := `<link rel="manifest" href="/manifest.webmanifest"><div id="root"></div>`
	if err := os.WriteFile(filepath.Join(root, "hub", "index.html"), []byte(page), 0o644); err != nil {
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
