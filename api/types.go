package main

import "encoding/json"

type Dashboard struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Branding     map[string]any `json:"branding"`
	LayoutPreset string         `json:"layoutPreset"`
	Applications []Application  `json:"applications"`
	Sections     []Section      `json:"sections"`
	Widgets      []Widget       `json:"widgets"`
	Layouts      []Layout       `json:"layouts"`
}

type Application struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	URL         string `json:"url"`
	DeepLink    string `json:"deepLink,omitempty"`
	Icon        string `json:"icon,omitempty"`
	Category    string `json:"category,omitempty"`
	StatusURL   string `json:"statusUrl,omitempty"`
	SectionID   string `json:"sectionId,omitempty"`
	Visible     bool   `json:"visible"`
}

type Section struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Collapsed bool   `json:"collapsed"`
}

type Widget struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Title   string         `json:"title"`
	Config  map[string]any `json:"config"`
	Visible bool           `json:"visible"`
}

type Layout struct {
	ID            string `json:"id"`
	Surface       string `json:"surface,omitempty"`
	Preset        string `json:"preset,omitempty"`
	Kind          string `json:"kind"`
	ApplicationID string `json:"applicationId,omitempty"`
	WidgetID      string `json:"widgetId,omitempty"`
	SectionID     string `json:"sectionId,omitempty"`
	ElementKey    string `json:"elementKey,omitempty"`
	Order         int    `json:"order"`
	X             int    `json:"x"`
	Y             int    `json:"y"`
	W             int    `json:"w"`
	H             int    `json:"h"`
}

type Asset struct {
	ID       string
	Name     string
	MimeType string
	Path     string
	Data     []byte
}

type apiError struct {
	Message string `json:"message"`
}

type messageResponse struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}

func cloneDashboard(source Dashboard) (Dashboard, error) {
	data, err := json.Marshal(source)
	if err != nil {
		return Dashboard{}, err
	}
	var copy Dashboard
	err = json.Unmarshal(data, &copy)
	normalizeDashboard(&copy)
	return copy, err
}

func normalizeDashboard(dashboard *Dashboard) {
	if dashboard.Branding == nil {
		dashboard.Branding = make(map[string]any)
	}
	if dashboard.Applications == nil {
		dashboard.Applications = make([]Application, 0)
	}
	if dashboard.Sections == nil {
		dashboard.Sections = make([]Section, 0)
	}
	if dashboard.Widgets == nil {
		dashboard.Widgets = make([]Widget, 0)
	}
	if dashboard.Layouts == nil {
		dashboard.Layouts = make([]Layout, 0)
	}
}
