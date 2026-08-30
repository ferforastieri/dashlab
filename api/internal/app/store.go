package app

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
	mu sync.Mutex
}

func OpenStore(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	store := &Store{db: db}
	if err := store.migrate(context.Background()); err != nil {
		db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) migrate(ctx context.Context) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS dashboard_state (
            singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`,
		`CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            data BLOB NOT NULL,
            created_at TEXT NOT NULL
        )`,
		`CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`,
	}
	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("migrate sqlite: %w", err)
		}
	}
	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM dashboard_state`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		return s.saveUnlocked(ctx, defaultDashboard())
	}
	return nil
}

func (s *Store) Settings(ctx context.Context) (map[string]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.QueryContext(ctx, `SELECT key, value FROM app_settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	settings := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		settings[key] = value
	}
	return settings, rows.Err()
}

func (s *Store) SaveSettings(ctx context.Context, settings map[string]string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for key, value := range settings {
		if _, err := s.db.ExecContext(ctx, `INSERT INTO app_settings(key, value, updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`, key, value, time.Now().UTC().Format(time.RFC3339)); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) Dashboard(ctx context.Context) (Dashboard, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.loadUnlocked(ctx)
}

func (s *Store) Update(ctx context.Context, update func(*Dashboard) error) (Dashboard, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	dashboard, err := s.loadUnlocked(ctx)
	if err != nil {
		return Dashboard{}, err
	}
	if err := update(&dashboard); err != nil {
		return Dashboard{}, err
	}
	if err := s.saveUnlocked(ctx, dashboard); err != nil {
		return Dashboard{}, err
	}
	return dashboard, nil
}

func (s *Store) loadUnlocked(ctx context.Context) (Dashboard, error) {
	var raw string
	if err := s.db.QueryRowContext(ctx, `SELECT data FROM dashboard_state WHERE singleton = 1`).Scan(&raw); err != nil {
		return Dashboard{}, err
	}
	var dashboard Dashboard
	if err := json.Unmarshal([]byte(raw), &dashboard); err != nil {
		return Dashboard{}, fmt.Errorf("decode dashboard: %w", err)
	}
	normalizeDashboard(&dashboard)
	return dashboard, nil
}

func (s *Store) saveUnlocked(ctx context.Context, dashboard Dashboard) error {
	normalizeDashboard(&dashboard)
	raw, err := json.Marshal(dashboard)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `INSERT INTO dashboard_state(singleton, data, updated_at)
        VALUES(1, ?, ?) ON CONFLICT(singleton) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
		string(raw), time.Now().UTC().Format(time.RFC3339))
	return err
}

func (s *Store) SaveAsset(ctx context.Context, asset Asset) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO assets(id, name, mime_type, path, data, created_at) VALUES(?,?,?,?,?,?)`,
		asset.ID, asset.Name, asset.MimeType, asset.Path, asset.Data, time.Now().UTC().Format(time.RFC3339))
	return err
}

func (s *Store) AssetByPath(ctx context.Context, path string) (Asset, error) {
	var asset Asset
	err := s.db.QueryRowContext(ctx, `SELECT id,name,mime_type,path,data FROM assets WHERE path=?`, path).
		Scan(&asset.ID, &asset.Name, &asset.MimeType, &asset.Path, &asset.Data)
	return asset, err
}

func (s *Store) DeleteAsset(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM assets WHERE id=?`, id)
	if err != nil {
		return err
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func newID(prefix string) string {
	value := make([]byte, 12)
	if _, err := rand.Read(value); err != nil {
		panic(err)
	}
	return prefix + "_" + hex.EncodeToString(value)
}

func defaultDashboard() Dashboard {
	dashboard := Dashboard{
		ID:           "dashlab-plus-local",
		Name:         "Meu DashLab+",
		LayoutPreset: "FREE",
		Branding: map[string]any{
			"name": "DashLab+", "accent": "#ff7a1a", "theme": "dark", "wallpaper": "",
			"logo": "", "favicon": "", "backgroundColor": "#101416", "panelColor": "#181d20",
			"textColor": "#e7eaec", "borderColor": "#343b3f", "radius": 5,
			"panelOpacity": 100, "wallpaperOverlay": 55, "fontScale": 100, "mobileLayout": "GRID",
		},
	}
	presets := []struct {
		title, kind string
		config      map[string]any
	}{
		{"Relógio", "CLOCK", map[string]any{}}, {"Sistema", "SYSTEM", map[string]any{}},
		{"Discos", "STORAGE", map[string]any{}}, {"Rede", "NETWORK", map[string]any{}},
	}
	for index, preset := range presets {
		widget := Widget{ID: newID("widget"), Type: preset.kind, Title: preset.title, Config: preset.config, Visible: true}
		dashboard.Widgets = append(dashboard.Widgets, widget)
		dashboard.Layouts = append(dashboard.Layouts,
			Layout{ID: newID("layout"), Surface: "WEB", Preset: "FREE", Kind: "WIDGET", WidgetID: widget.ID, Order: index, X: 0, Y: index * 132, W: 340, H: 116},
			Layout{ID: newID("layout"), Surface: "MOBILE", Preset: "ZIMA", Kind: "WIDGET", WidgetID: widget.ID, Order: 100 + index, X: 0, Y: 3 + index, W: 3, H: 1},
		)
	}
	elements := []struct {
		key        string
		x, y, w, h int
	}{
		{"BRAND", 0, 4, 230, 64}, {"CLOCK", 250, 4, 100, 64}, {"WEATHER", 370, 4, 210, 64},
		{"ACTIONS", 600, 8, 160, 52}, {"ADD", 780, 8, 52, 52},
		{"FOOTER", 0, 820, 1332, 30},
	}
	for index, element := range elements {
		dashboard.Layouts = append(dashboard.Layouts, Layout{ID: newID("layout"), Surface: "WEB", Preset: "FREE", Kind: "DASHBOARD_ELEMENT", ElementKey: element.key, Order: 1000 + index, X: element.x, Y: element.y, W: element.w, H: element.h})
	}
	return dashboard
}

var errNotFound = errors.New("not found")
