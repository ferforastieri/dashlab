package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type Server struct {
	store             *Store
	integrations      *Integrations
	logger            *slog.Logger
	outboundAllowlist map[string]struct{}
	limiter           *requestLimiter
	sessions          map[string]authIdentity
	sessionsMu        sync.RWMutex
}

type rateWindow struct {
	started time.Time
	count   int
}
type requestLimiter struct {
	mu      sync.Mutex
	windows map[string]rateWindow
}

func newRequestLimiter() *requestLimiter {
	return &requestLimiter{windows: make(map[string]rateWindow)}
}
func (l *requestLimiter) allow(key string, limit int, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	w := l.windows[key]
	if now.Sub(w.started) >= time.Minute {
		w = rateWindow{started: now}
	}
	w.count++
	l.windows[key] = w
	if len(l.windows) > 5000 {
		for k, item := range l.windows {
			if now.Sub(item.started) > 2*time.Minute {
				delete(l.windows, k)
			}
		}
	}
	return w.count <= limit
}

// Run starts the DashLab+ HTTP service and blocks until it receives a shutdown signal.
// Keeping the lifecycle here leaves cmd/server as a small, conventional entrypoint.
func Run() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	dataPath := env("DATABASE_PATH", "/data/dashlab-plus.db")
	store, err := OpenStore(dataPath)
	if err != nil {
		logger.Error("open database", "error", err)
		os.Exit(1)
	}
	defer store.Close()
	if err := store.ensureUsers(context.Background()); err != nil {
		logger.Error("initialize users", "error", err)
		os.Exit(1)
	}

	outboundAllowlist := map[string]struct{}{"*": {}}
	integrations := NewIntegrations()
	integrations.allowlist = outboundAllowlist
	if settings, settingsErr := store.Settings(context.Background()); settingsErr == nil {
		integrations.Configure(settings)
	}
	server := &Server{
		store:             store,
		integrations:      integrations,
		logger:            logger,
		outboundAllowlist: outboundAllowlist,
		limiter:           newRequestLimiter(),
		sessions:          make(map[string]authIdentity),
	}
	httpServer := &http.Server{
		Addr:              ":" + env("PORT", "3000"),
		Handler:           server.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("DashLab+ API started", "address", httpServer.Addr, "database", dataPath)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(ctx)
}

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.health)
	mux.HandleFunc("GET /api/version", s.version)
	mux.HandleFunc("GET /api/auth/status", s.authStatus)
	mux.HandleFunc("GET /api/auth/branding", s.publicBranding)
	mux.HandleFunc("GET /api/auth/branding/logo", s.publicBrandingLogo)
	mux.HandleFunc("POST /api/auth/bootstrap", s.bootstrap)
	mux.HandleFunc("POST /api/auth/login", s.login)
	mux.HandleFunc("GET /api/auth/users", s.listUsers)
	mux.HandleFunc("POST /api/auth/users", s.createUser)
	mux.HandleFunc("DELETE /api/auth/users/{id}", s.deleteUser)
	mux.HandleFunc("GET /api/settings", s.settings)
	mux.HandleFunc("PUT /api/settings", s.saveSettings)
	mux.HandleFunc("POST /api/update", s.update)
	mux.HandleFunc("GET /api/dashboard", s.dashboard)
	mux.HandleFunc("PUT /api/branding", s.branding)
	mux.HandleFunc("POST /api/applications", s.createApplication)
	mux.HandleFunc("PATCH /api/applications/{id}", s.updateApplication)
	mux.HandleFunc("DELETE /api/applications/{id}", s.deleteApplication)
	mux.HandleFunc("POST /api/sections", s.createSection)
	mux.HandleFunc("PATCH /api/sections/{id}", s.updateSection)
	mux.HandleFunc("DELETE /api/sections/{id}", s.deleteSection)
	mux.HandleFunc("POST /api/widgets", s.createWidget)
	mux.HandleFunc("PATCH /api/widgets/{id}", s.updateWidget)
	mux.HandleFunc("DELETE /api/widgets/{id}", s.deleteWidget)
	mux.HandleFunc("PUT /api/layouts/{surface}", s.saveLayout)
	mux.HandleFunc("GET /api/metrics/overview", s.metricsOverview)
	mux.HandleFunc("GET /api/metrics/history", s.metricsHistory)
	mux.HandleFunc("GET /api/widgets/{id}/data", s.widgetData)
	mux.HandleFunc("GET /api/applications/status", s.applicationStatuses)
	mux.HandleFunc("GET /api/weather", s.weather)
	mux.HandleFunc("POST /api/assets", s.uploadAsset)
	mux.HandleFunc("GET /api/assets/files/{filename}", s.assetFile)
	mux.HandleFunc("DELETE /api/assets/{id}", s.deleteAsset)
	mux.HandleFunc("GET /api/pwa/{dashboardId}/manifest.webmanifest", s.pwaManifest)
	mux.HandleFunc("GET /api/pwa/{dashboardId}/icon/{file}", s.pwaIcon)
	mux.Handle("/", webHandler(env("WEB_ROOT", "/app/web")))
	return s.securityHeaders(s.auth(s.originCheck(s.rateLimit(s.recoverPanic(s.logRequests(mux))))))
}

// auth protects the single-user API and UI with HTTP Basic authentication.
// Health remains public so Docker can perform its health check.
func (s *Server) auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api/health" || r.URL.Path == "/api/version" || r.URL.Path == "/api/auth/status" || r.URL.Path == "/api/auth/branding" || r.URL.Path == "/api/auth/branding/logo" || r.URL.Path == "/api/auth/bootstrap" || r.URL.Path == "/api/auth/login" {
			next.ServeHTTP(w, r)
			return
		}
		if cookie, err := r.Cookie("dashlab_session"); err == nil {
			s.sessionsMu.RLock()
			identity, valid := s.sessions[cookie.Value]
			s.sessionsMu.RUnlock()
			if valid {
				r = r.WithContext(context.WithValue(r.Context(), authContextKey{}, identity))
				next.ServeHTTP(w, r)
				return
			}
		}
		user, password, ok := r.BasicAuth()
		identity, valid := authIdentity{}, false
		if ok {
			identity, valid = s.store.authenticateUser(r.Context(), user, password)
		}
		if !valid {
			writeError(w, http.StatusUnauthorized, "Autenticação necessária")
			return
		}
		token := randomSession()
		s.sessionsMu.Lock()
		s.sessions[token] = identity
		s.sessionsMu.Unlock()
		http.SetCookie(w, &http.Cookie{Name: "dashlab_session", Value: token, Path: "/", MaxAge: 30 * 24 * 60 * 60, HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: r.TLS != nil})
		r = r.WithContext(context.WithValue(r.Context(), authContextKey{}, identity))
		next.ServeHTTP(w, r)
	})
}

func (s *Server) originCheck(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions {
			if origin := strings.TrimSpace(r.Header.Get("Origin")); origin != "" {
				parsed, err := url.Parse(origin)
				if err != nil || parsed.Host == "" || !strings.EqualFold(parsed.Host, r.Host) {
					writeError(w, http.StatusForbidden, "Origem não permitida")
					return
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "name": "DashLab+", "storage": "sqlite"})
}

func (s *Server) authStatus(w http.ResponseWriter, r *http.Request) {
	users, err := s.store.users(r.Context())
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	identity := s.sessionIdentity(r)
	writeJSON(w, 200, map[string]any{"setup": len(users) == 0, "authenticated": identity.Username != ""})
}

func (s *Server) publicBranding(w http.ResponseWriter, r *http.Request) {
	dashboard, err := s.store.Dashboard(r.Context())
	if err != nil {
		s.fail(w, http.StatusInternalServerError, err)
		return
	}
	logo := stringValue(dashboard.Branding["logo"])
	if logo != "" {
		logo = "/api/auth/branding/logo"
	} else {
		logo = "/logo.png"
	}
	name := stringValue(dashboard.Branding["name"])
	if name == "" {
		name = dashboard.Name
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]string{"name": truncate(name, 80), "logo": logo})
}

func (s *Server) publicBrandingLogo(w http.ResponseWriter, r *http.Request) {
	dashboard, err := s.store.Dashboard(r.Context())
	if err != nil {
		s.fail(w, http.StatusInternalServerError, err)
		return
	}
	logo := stringValue(dashboard.Branding["logo"])
	filename := strings.TrimPrefix(logo, "/api/assets/files/")
	if filename == logo || filename == "" {
		http.NotFound(w, r)
		return
	}
	asset, err := s.store.AssetByPath(r.Context(), filename)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", asset.MimeType)
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	_, _ = w.Write(asset.Data)
}
func (s *Server) sessionIdentity(r *http.Request) authIdentity {
	if cookie, err := r.Cookie("dashlab_session"); err == nil {
		s.sessionsMu.RLock()
		identity := s.sessions[cookie.Value]
		s.sessionsMu.RUnlock()
		return identity
	}
	return authIdentity{}
}
func (s *Server) bootstrap(w http.ResponseWriter, r *http.Request) {
	users, err := s.store.users(r.Context())
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	if len(users) > 0 {
		writeError(w, 409, "Administrador já configurado")
		return
	}
	var p struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &p) {
		return
	}
	user, err := s.store.createUser(r.Context(), p.Username, p.Password, "admin")
	if err != nil {
		writeError(w, 400, "Administrador inválido")
		return
	}
	s.startSession(w, r, authIdentity{Username: user.Username, Role: "admin"})
	writeJSON(w, 201, user)
}
func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &p) {
		return
	}
	identity, ok := s.store.authenticateUser(r.Context(), p.Username, p.Password)
	if !ok {
		writeError(w, 401, "Credenciais inválidas")
		return
	}
	s.startSession(w, r, identity)
	writeJSON(w, 200, map[string]string{"role": identity.Role})
}
func (s *Server) startSession(w http.ResponseWriter, r *http.Request, identity authIdentity) {
	token := randomSession()
	s.sessionsMu.Lock()
	s.sessions[token] = identity
	s.sessionsMu.Unlock()
	http.SetCookie(w, &http.Cookie{Name: "dashlab_session", Value: token, Path: "/", MaxAge: 30 * 24 * 60 * 60, HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: r.TLS != nil})
}

func currentIdentity(r *http.Request) authIdentity {
	identity, _ := r.Context().Value(authContextKey{}).(authIdentity)
	return identity
}
func requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	if currentIdentity(r).Role != "admin" {
		writeError(w, http.StatusForbidden, "Permissão de administrador necessária")
		return false
	}
	return true
}
func (s *Server) listUsers(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	users, err := s.store.users(r.Context())
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	writeJSON(w, 200, users)
}
func (s *Server) createUser(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	var payload struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if !decodeJSON(w, r, &payload) {
		return
	}
	if payload.Role == "" {
		payload.Role = "user"
	}
	user, err := s.store.createUser(r.Context(), payload.Username, payload.Password, payload.Role)
	if err != nil {
		writeError(w, 400, "Usuário inválido ou já existente")
		return
	}
	writeJSON(w, 201, user)
}
func (s *Server) deleteUser(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	id := r.PathValue("id")
	identity := currentIdentity(r)
	var username string
	if err := s.store.db.QueryRowContext(r.Context(), `SELECT username FROM users WHERE id=?`, id).Scan(&username); err != nil {
		writeError(w, 404, "Usuário não encontrado")
		return
	}
	if username == identity.Username {
		writeError(w, 400, "Não é possível remover o usuário atual")
		return
	}
	if _, err := s.store.db.ExecContext(r.Context(), `DELETE FROM users WHERE id=?`, id); err != nil {
		s.fail(w, 500, err)
		return
	}
	writeJSON(w, 200, messageResponse{OK: true, Message: "Usuário removido com sucesso"})
}

func (s *Server) version(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]string{"version": BuildVersion})
}

func (s *Server) settings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.Settings(r.Context())
	if err != nil {
		s.fail(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"prometheusUrl": settings["prometheus_url"], "targetLabels": settings["prometheus_target_labels"], "networkLabels": settings["prometheus_network_labels"], "diskLabels": settings["prometheus_disk_labels"]})
}

func (s *Server) saveSettings(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	var payload struct {
		PrometheusURL string `json:"prometheusUrl"`
		TargetLabels  string `json:"targetLabels"`
		NetworkLabels string `json:"networkLabels"`
		DiskLabels    string `json:"diskLabels"`
	}
	if !decodeJSON(w, r, &payload) {
		return
	}
	if payload.PrometheusURL != "" {
		parsed, err := url.Parse(strings.TrimSpace(payload.PrometheusURL))
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Hostname() == "" || parsed.User != nil {
			writeError(w, http.StatusBadRequest, "URL do Prometheus inválida")
			return
		}
		if err := validateOutboundURL(parsed.String(), s.outboundAllowlist); err != nil {
			writeError(w, http.StatusBadRequest, "Destino do Prometheus não permitido")
			return
		}
	}
	settings := map[string]string{"prometheus_url": strings.TrimSpace(payload.PrometheusURL)}
	settings["prometheus_target_labels"] = strings.TrimSpace(payload.TargetLabels)
	settings["prometheus_network_labels"] = strings.TrimSpace(payload.NetworkLabels)
	settings["prometheus_disk_labels"] = strings.TrimSpace(payload.DiskLabels)
	if err := s.store.SaveSettings(r.Context(), settings); err != nil {
		s.fail(w, http.StatusInternalServerError, err)
		return
	}
	s.integrations.Configure(settings)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) update(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	request, err := http.NewRequest(http.MethodPost, "http://dashlab-plus-updater:8080/v1/update", nil)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Não foi possível iniciar a atualização")
		return
	}
	client := &http.Client{Timeout: 8 * time.Second}
	go func() {
		response, err := client.Do(request)
		if err != nil {
			s.logger.Warn("automatic update request failed", "error", err)
			return
		}
		_ = response.Body.Close()
		if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
			s.logger.Warn("updater rejected automatic update", "status", response.StatusCode)
		}
	}()
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "started"})
}

func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	dashboard, err := s.store.Dashboard(r.Context())
	if err != nil {
		s.fail(w, http.StatusInternalServerError, err)
		return
	}
	surface := strings.ToUpper(r.URL.Query().Get("surface"))
	if surface != "MOBILE" {
		surface = "WEB"
	}
	preset := "FREE"
	if surface == "MOBILE" {
		preset = "ZIMA"
	}
	layouts := make([]Layout, 0)
	for _, layout := range dashboard.Layouts {
		if layout.Surface == surface && layout.Preset == preset {
			layouts = append(layouts, layout)
		}
	}
	dashboard.Layouts = layouts
	dashboard.LayoutPreset = preset
	writeJSON(w, http.StatusOK, dashboard)
}

func (s *Server) branding(w http.ResponseWriter, r *http.Request) {
	var values map[string]any
	if !decodeJSON(w, r, &values) {
		return
	}
	values, err := sanitizeBranding(values)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Personalização inválida")
		return
	}
	dashboard, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		if name, ok := values["name"].(string); ok && strings.TrimSpace(name) != "" {
			dashboard.Name = truncate(strings.TrimSpace(name), 80)
		}
		for key, value := range values {
			dashboard.Branding[key] = value
		}
		return nil
	})
	if err != nil {
		s.fail(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, withMessage(dashboard, "Personalização salva com sucesso"))
}

func sanitizeBranding(values map[string]any) (map[string]any, error) {
	allowed := map[string]bool{"name": true, "wallpaper": true, "logo": true, "favicon": true, "accent": true, "theme": true, "backgroundColor": true, "panelColor": true, "textColor": true, "borderColor": true, "radius": true, "panelOpacity": true, "wallpaperOverlay": true, "fontScale": true, "mobileLayout": true}
	result := map[string]any{}
	for key, value := range values {
		if !allowed[key] {
			continue
		}
		if key == "wallpaper" || key == "logo" || key == "favicon" {
			text, ok := value.(string)
			if !ok || (text != "" && !strings.HasPrefix(text, "/api/assets/files/")) {
				return nil, errors.New("invalid asset URL")
			}
		}
		if strings.HasSuffix(strings.ToLower(key), "color") || key == "accent" {
			if _, ok := value.(string); !ok || !regexp.MustCompile(`^#[0-9a-fA-F]{6}$`).MatchString(value.(string)) {
				return nil, errors.New("invalid color")
			}
		}
		if key == "theme" {
			text, ok := value.(string)
			if !ok || (text != "dark" && text != "light") {
				return nil, errors.New("invalid theme")
			}
		}
		if key == "mobileLayout" {
			text, ok := value.(string)
			if !ok || (text != "GRID" && text != "DRAWER" && text != "BOTTOM") {
				return nil, errors.New("invalid mobile layout")
			}
		}
		if key == "radius" || key == "panelOpacity" || key == "wallpaperOverlay" || key == "fontScale" {
			number, ok := value.(float64)
			if !ok || number < 0 || number > 200 {
				return nil, errors.New("invalid numeric branding value")
			}
		}
		result[key] = value
	}
	return result, nil
}

func (s *Server) createApplication(w http.ResponseWriter, r *http.Request) {
	var application Application
	if !decodeJSON(w, r, &application) {
		return
	}
	application.Name = truncate(strings.TrimSpace(application.Name), 80)
	if application.Name == "" || !validHTTPURL(application.URL) || !outboundURLAllowed(application.URL, s.outboundAllowlist) {
		writeError(w, http.StatusBadRequest, "Informe um nome e uma URL HTTP válida")
		return
	}
	if application.StatusURL != "" && (!validHTTPURL(application.StatusURL) || !outboundURLAllowed(application.StatusURL, s.outboundAllowlist)) {
		writeError(w, http.StatusBadRequest, "A URL de status é inválida")
		return
	}
	application.ID = newID("app")
	application.Visible = true
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		if application.SectionID != "" && findSection(dashboard.Sections, application.SectionID) < 0 {
			return errNotFound
		}
		dashboard.Applications = append(dashboard.Applications, application)
		addLayouts(dashboard, "APPLICATION", application.ID, "")
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, withMessage(application, "Aplicativo criado com sucesso"))
}

func (s *Server) updateApplication(w http.ResponseWriter, r *http.Request) {
	var patch map[string]any
	if !decodeJSON(w, r, &patch) {
		return
	}
	id := r.PathValue("id")
	var updated Application
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		index := findApplication(dashboard.Applications, id)
		if index < 0 {
			return errNotFound
		}
		if section, ok := patch["sectionId"].(string); ok && section != "" && findSection(dashboard.Sections, section) < 0 {
			return errNotFound
		}
		if err := mergeJSON(&dashboard.Applications[index], patch); err != nil {
			return err
		}
		updated = dashboard.Applications[index]
		if updated.Name == "" || !validHTTPURL(updated.URL) || !outboundURLAllowed(updated.URL, s.outboundAllowlist) || (updated.StatusURL != "" && (!validHTTPURL(updated.StatusURL) || !outboundURLAllowed(updated.StatusURL, s.outboundAllowlist))) {
			return fmt.Errorf("invalid application")
		}
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withMessage(updated, "Aplicativo atualizado com sucesso"))
}

func (s *Server) deleteApplication(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		index := findApplication(dashboard.Applications, id)
		if index < 0 {
			return errNotFound
		}
		dashboard.Applications = append(dashboard.Applications[:index], dashboard.Applications[index+1:]...)
		dashboard.Layouts = filterLayouts(dashboard.Layouts, func(layout Layout) bool { return layout.ApplicationID != id })
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, messageResponse{OK: true, Message: "Aplicativo excluído com sucesso"})
}

type sectionPayload struct {
	Name           *string  `json:"name"`
	Collapsed      *bool    `json:"collapsed"`
	ApplicationIDs []string `json:"applicationIds"`
}

func (s *Server) createSection(w http.ResponseWriter, r *http.Request) {
	var payload sectionPayload
	if !decodeJSON(w, r, &payload) || payload.Name == nil || strings.TrimSpace(*payload.Name) == "" {
		if payload.Name == nil {
			writeError(w, http.StatusBadRequest, "Informe o nome da seção")
		}
		return
	}
	section := Section{ID: newID("section"), Name: truncate(strings.TrimSpace(*payload.Name), 80)}
	if payload.Collapsed != nil {
		section.Collapsed = *payload.Collapsed
	}
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		if !applicationsExist(dashboard.Applications, payload.ApplicationIDs) {
			return errNotFound
		}
		dashboard.Sections = append(dashboard.Sections, section)
		assignSection(dashboard.Applications, section.ID, payload.ApplicationIDs)
		addLayouts(dashboard, "SECTION", section.ID, "")
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, withMessage(section, "Seção criada com sucesso"))
}

func (s *Server) updateSection(w http.ResponseWriter, r *http.Request) {
	var payload sectionPayload
	if !decodeJSON(w, r, &payload) {
		return
	}
	id := r.PathValue("id")
	var updated Section
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		index := findSection(dashboard.Sections, id)
		if index < 0 {
			return errNotFound
		}
		if payload.Name != nil {
			dashboard.Sections[index].Name = truncate(strings.TrimSpace(*payload.Name), 80)
		}
		if payload.Collapsed != nil {
			dashboard.Sections[index].Collapsed = *payload.Collapsed
		}
		if payload.ApplicationIDs != nil {
			if !applicationsExist(dashboard.Applications, payload.ApplicationIDs) {
				return errNotFound
			}
			assignSection(dashboard.Applications, id, payload.ApplicationIDs)
		}
		updated = dashboard.Sections[index]
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withMessage(updated, "Seção atualizada com sucesso"))
}

func (s *Server) deleteSection(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		index := findSection(dashboard.Sections, id)
		if index < 0 {
			return errNotFound
		}
		dashboard.Sections = append(dashboard.Sections[:index], dashboard.Sections[index+1:]...)
		for index := range dashboard.Applications {
			if dashboard.Applications[index].SectionID == id {
				dashboard.Applications[index].SectionID = ""
			}
		}
		dashboard.Layouts = filterLayouts(dashboard.Layouts, func(layout Layout) bool { return layout.SectionID != id })
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, messageResponse{OK: true, Message: "Seção excluída com sucesso"})
}

func (s *Server) createWidget(w http.ResponseWriter, r *http.Request) {
	var widget Widget
	if !decodeJSON(w, r, &widget) {
		return
	}
	if !validWidgetType(widget.Type) || strings.TrimSpace(widget.Title) == "" {
		writeError(w, http.StatusBadRequest, "Informe título e tipo de widget válidos")
		return
	}
	widget.ID, widget.Visible = newID("widget"), true
	widget.Title = truncate(strings.TrimSpace(widget.Title), 80)
	if widget.Config == nil {
		widget.Config = map[string]any{}
	}
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		dashboard.Widgets = append(dashboard.Widgets, widget)
		addLayouts(dashboard, "WIDGET", widget.ID, widget.Type)
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, withMessage(widget, "Widget criado com sucesso"))
}

func (s *Server) updateWidget(w http.ResponseWriter, r *http.Request) {
	var patch map[string]any
	if !decodeJSON(w, r, &patch) {
		return
	}
	id := r.PathValue("id")
	var updated Widget
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		index := findWidget(dashboard.Widgets, id)
		if index < 0 {
			return errNotFound
		}
		if err := mergeJSON(&dashboard.Widgets[index], patch); err != nil {
			return err
		}
		if !validWidgetType(dashboard.Widgets[index].Type) {
			return fmt.Errorf("invalid widget")
		}
		updated = dashboard.Widgets[index]
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withMessage(updated, "Widget atualizado com sucesso"))
}

func (s *Server) deleteWidget(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		index := findWidget(dashboard.Widgets, id)
		if index < 0 {
			return errNotFound
		}
		dashboard.Widgets = append(dashboard.Widgets[:index], dashboard.Widgets[index+1:]...)
		dashboard.Layouts = filterLayouts(dashboard.Layouts, func(layout Layout) bool { return layout.WidgetID != id })
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, messageResponse{OK: true, Message: "Widget excluído com sucesso"})
}

func (s *Server) saveLayout(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Items []Layout `json:"items"`
	}
	if !decodeJSON(w, r, &payload) {
		return
	}
	surface := strings.ToUpper(r.PathValue("surface"))
	if surface != "WEB" && surface != "MOBILE" {
		writeError(w, http.StatusBadRequest, "Superfície inválida")
		return
	}
	preset := "FREE"
	if surface == "MOBILE" {
		preset = "ZIMA"
	}
	_, err := s.store.Update(r.Context(), func(dashboard *Dashboard) error {
		for _, item := range payload.Items {
			if !validLayout(*dashboard, item) {
				return fmt.Errorf("invalid layout")
			}
		}
		dashboard.Layouts = filterLayouts(dashboard.Layouts, func(layout Layout) bool { return layout.Surface != surface || layout.Preset != preset })
		for index, item := range payload.Items {
			item.ID, item.Surface, item.Preset, item.Order = newID("layout"), surface, preset, index
			if item.W < 1 {
				item.W = 1
			}
			if item.H < 1 {
				item.H = 1
			}
			dashboard.Layouts = append(dashboard.Layouts, item)
		}
		return nil
	})
	if err != nil {
		s.storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, messageResponse{OK: true, Message: "Organização salva com sucesso"})
}

func (s *Server) metricsOverview(w http.ResponseWriter, r *http.Request) {
	result, err := s.integrations.MetricsOverview(r.Context())
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) metricsHistory(w http.ResponseWriter, r *http.Request) {
	rangeValue := r.URL.Query().Get("range")
	result, err := s.integrations.MetricsHistory(r.Context(), rangeValue)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) widgetData(w http.ResponseWriter, r *http.Request) {
	dashboard, err := s.store.Dashboard(r.Context())
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	index := findWidget(dashboard.Widgets, r.PathValue("id"))
	if index < 0 || dashboard.Widgets[index].Type != "PROMQL" {
		writeError(w, http.StatusNotFound, "Widget não encontrado")
		return
	}
	query, _ := dashboard.Widgets[index].Config["query"].(string)
	result, err := s.integrations.PromQL(r.Context(), query)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) applicationStatuses(w http.ResponseWriter, r *http.Request) {
	dashboard, err := s.store.Dashboard(r.Context())
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	writeJSON(w, http.StatusOK, s.integrations.Statuses(r.Context(), dashboard.Applications))
}

func (s *Server) weather(w http.ResponseWriter, r *http.Request) {
	latitude, errLat := strconv.ParseFloat(r.URL.Query().Get("latitude"), 64)
	longitude, errLon := strconv.ParseFloat(r.URL.Query().Get("longitude"), 64)
	if errLat != nil || errLon != nil || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 {
		writeError(w, http.StatusBadRequest, "Coordenadas inválidas")
		return
	}
	result, err := s.integrations.Weather(r.Context(), latitude, longitude)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) storeError(w http.ResponseWriter, err error) {
	if errors.Is(err, errNotFound) {
		writeError(w, http.StatusNotFound, "Item não encontrado")
		return
	}
	if strings.Contains(err.Error(), "invalid") {
		writeError(w, http.StatusBadRequest, "Dados inválidos")
		return
	}
	s.fail(w, http.StatusInternalServerError, err)
}

func (s *Server) fail(w http.ResponseWriter, status int, err error) {
	s.logger.Error("request failed", "status", status, "error", err)
	writeError(w, status, "Não foi possível continuar")
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return false
	}
	return true
}

func mergeJSON(target any, patch map[string]any) error {
	current, _ := json.Marshal(target)
	var values map[string]any
	if err := json.Unmarshal(current, &values); err != nil {
		return err
	}
	for key, value := range patch {
		values[key] = value
	}
	merged, err := json.Marshal(values)
	if err != nil {
		return err
	}
	return json.Unmarshal(merged, target)
}

func withMessage(value any, message string) map[string]any {
	raw, _ := json.Marshal(value)
	result := map[string]any{}
	_ = json.Unmarshal(raw, &result)
	result["message"] = message
	return result
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, apiError{Message: message})
}
func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
func truncate(value string, size int) string {
	runes := []rune(value)
	if len(runes) <= size {
		return value
	}
	return string(runes[:size])
}
func validHTTPURL(value string) bool {
	parsed, err := url.ParseRequestURI(value)
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

func parseAllowlist(value string) map[string]struct{} {
	result := map[string]struct{}{}
	for _, item := range strings.Split(value, ",") {
		if host := strings.ToLower(strings.TrimSpace(item)); host != "" {
			result[host] = struct{}{}
		}
	}
	return result
}

func outboundURLAllowed(value string, allowlist map[string]struct{}) bool {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(value))
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Hostname() == "" || parsed.User != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	if _, explicitlyAllowed := allowlist[host]; explicitlyAllowed {
		return true
	}
	if _, allAllowed := allowlist["*"]; allAllowed {
		return true
	}
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") {
		return false
	}
	ip := net.ParseIP(host)
	if ip == nil {
		// Single-label names are normally Docker/LAN names; require explicit
		// authorization. Resolve public hostnames to catch DNS pointing at LAN.
		if !strings.Contains(host, ".") {
			return false
		}
		ips, err := net.LookupIP(host)
		if err != nil {
			return true
		}
		for _, resolved := range ips {
			if resolved.IsLoopback() || resolved.IsPrivate() || resolved.IsLinkLocalUnicast() || resolved.IsLinkLocalMulticast() || resolved.IsUnspecified() {
				return false
			}
		}
		return true
	}
	return !ip.IsLoopback() && !ip.IsPrivate() && !ip.IsLinkLocalUnicast() && !ip.IsLinkLocalMulticast() && !ip.IsUnspecified()
}

func validateOutboundURL(value string, allowlist map[string]struct{}) error {
	if !outboundURLAllowed(value, allowlist) {
		return errors.New("outbound destination blocked")
	}
	return nil
}
func findApplication(items []Application, id string) int {
	for index := range items {
		if items[index].ID == id {
			return index
		}
	}
	return -1
}
func findSection(items []Section, id string) int {
	for index := range items {
		if items[index].ID == id {
			return index
		}
	}
	return -1
}
func findWidget(items []Widget, id string) int {
	for index := range items {
		if items[index].ID == id {
			return index
		}
	}
	return -1
}
func filterLayouts(items []Layout, keep func(Layout) bool) []Layout {
	result := make([]Layout, 0, len(items))
	for _, item := range items {
		if keep(item) {
			result = append(result, item)
		}
	}
	return result
}
func validWidgetType(value string) bool {
	return map[string]bool{"SYSTEM": true, "STORAGE": true, "NETWORK": true, "STATUS": true, "PROMQL": true, "DIVIDER": true}[value]
}
func applicationsExist(items []Application, ids []string) bool {
	found := map[string]bool{}
	for _, item := range items {
		found[item.ID] = true
	}
	for _, id := range ids {
		if !found[id] {
			return false
		}
	}
	return true
}
func assignSection(items []Application, sectionID string, ids []string) {
	selected := map[string]bool{}
	for _, id := range ids {
		selected[id] = true
	}
	for index := range items {
		if items[index].SectionID == sectionID {
			items[index].SectionID = ""
		}
		if selected[items[index].ID] {
			items[index].SectionID = sectionID
		}
	}
}

func validLayout(dashboard Dashboard, layout Layout) bool {
	if layout.W < 1 || layout.H < 1 || layout.X < 0 || layout.Y < 0 {
		return false
	}
	switch layout.Kind {
	case "APPLICATION":
		return findApplication(dashboard.Applications, layout.ApplicationID) >= 0
	case "WIDGET":
		return findWidget(dashboard.Widgets, layout.WidgetID) >= 0
	case "SECTION":
		return findSection(dashboard.Sections, layout.SectionID) >= 0
	case "DASHBOARD_ELEMENT":
		return map[string]bool{"BRAND": true, "CLOCK": true, "WEATHER": true, "SEARCH": true, "ACTIONS": true, "ADD": true, "FOOTER": true}[layout.ElementKey]
	default:
		return false
	}
}

func addLayouts(dashboard *Dashboard, kind, id, widgetType string) {
	for _, surface := range []string{"WEB", "MOBILE"} {
		preset := "FREE"
		if surface == "MOBILE" {
			preset = "ZIMA"
		}
		count := 0
		for _, layout := range dashboard.Layouts {
			if layout.Surface == surface && layout.Kind == kind {
				count++
			}
		}
		layout := Layout{ID: newID("layout"), Surface: surface, Preset: preset, Kind: kind, Order: 100 + count}
		switch kind {
		case "APPLICATION":
			layout.ApplicationID = id
		case "WIDGET":
			layout.WidgetID = id
		case "SECTION":
			layout.SectionID = id
		}
		mobile := surface == "MOBILE"
		if kind == "APPLICATION" {
			if mobile {
				layout.X, layout.Y, layout.W, layout.H = count%3, count/3, 1, 1
			} else {
				layout.X, layout.Y, layout.W, layout.H = 380+(count%4)*126, (count/4)*126, 112, 112
			}
		} else if kind == "SECTION" {
			if mobile {
				layout.X, layout.Y, layout.W, layout.H = 0, 3+count, 3, 2
			} else {
				layout.X, layout.Y, layout.W, layout.H = 360, count*260, 520, 240
			}
		} else if widgetType == "DIVIDER" {
			if mobile {
				layout.X, layout.Y, layout.W, layout.H = 0, 3+count, 3, 1
			} else {
				layout.X, layout.Y, layout.W, layout.H = 0, count*132, 760, 32
			}
		} else if mobile {
			layout.X, layout.Y, layout.W, layout.H = 0, 3+count, 3, 1
		} else {
			layout.X, layout.Y, layout.W, layout.H = 0, count*132, 340, 116
		}
		dashboard.Layouts = append(dashboard.Layouts, layout)
	}
}

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		// The dashboard requests the browser's location for the optional weather
		// element. Keep camera/microphone disabled while allowing same-origin
		// geolocation on HTTPS installations.
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)")
		w.Header().Set("Cross-Origin-Resource-Policy", "same-origin")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("Cache-Control", "no-store")
		}
		w.Header().Set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://dashlabplus.vercel.app https://api.github.com")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) rateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.limiter == nil {
			next.ServeHTTP(w, r)
			return
		}
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		limit := 120
		if strings.HasPrefix(r.URL.Path, "/api/") {
			limit = 90
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			limit = 30
		}
		if r.URL.Path == "/api/update" {
			limit = 2
		}
		key := ip + ":" + r.Method
		if strings.HasPrefix(r.URL.Path, "/api/") {
			key += ":api"
		}
		if r.URL.Path == "/api/update" {
			key += ":update"
		}
		if !s.limiter.allow(key, limit, time.Now()) {
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "Muitas solicitações; tente novamente em instantes")
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/") && r.URL.Path != "/api/assets" {
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		}
		next.ServeHTTP(w, r)
	})
}
func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r)
		s.logger.Info("request", "method", r.Method, "path", r.URL.Path, "duration", time.Since(started).String())
	})
}
func (s *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if value := recover(); value != nil {
				s.logger.Error("panic", "value", value)
				writeError(w, 500, "Não foi possível continuar")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
