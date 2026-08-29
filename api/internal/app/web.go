package app

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// webHandler serves the built landing, documentation, and Server Hub from the
// same process as the API. WEB_ROOT remains optional so API-only development
// and tests do not depend on a frontend build.
func webHandler(root string) http.Handler {
	if strings.TrimSpace(root) == "" {
		return http.NotFoundHandler()
	}

	files := http.FileServer(http.Dir(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}

		if dashboardID, ok := installedDashboardID(r.URL.Path); ok {
			serveInstalledHub(w, r, root, dashboardID)
			return
		}

		files.ServeHTTP(w, r)
	})
}

func installedDashboardID(requestPath string) (string, bool) {
	parts := strings.Split(strings.Trim(requestPath, "/"), "/")
	if len(parts) != 2 || parts[0] != "pwa" || parts[1] == "" {
		return "", false
	}
	for _, character := range parts[1] {
		if (character < 'a' || character > 'z') &&
			(character < 'A' || character > 'Z') &&
			(character < '0' || character > '9') && character != '-' && character != '_' {
			return "", false
		}
	}
	return parts[1], true
}

func serveInstalledHub(w http.ResponseWriter, r *http.Request, root, dashboardID string) {
	page, err := os.ReadFile(filepath.Join(root, "hub", "index.html"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	page = []byte(strings.ReplaceAll(
		string(page),
		"/lab.webmanifest",
		"/api/pwa/"+dashboardID+"/manifest.webmanifest",
	))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Content-Length", strconv.Itoa(len(page)))
	if r.Method == http.MethodGet {
		_, _ = w.Write(page)
	}
}
