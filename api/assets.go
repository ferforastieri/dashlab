package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	_ "image/gif"
	_ "image/jpeg"
)

var allowedImages = map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}

func (s *Server) uploadAsset(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 6<<20)
	if err := r.ParseMultipartForm(6 << 20); err != nil {
		writeError(w, 400, "A imagem deve ter no máximo 5 MB")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, 400, "Arquivo ausente")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, 5<<20+1))
	if err != nil || len(data) > 5<<20 {
		writeError(w, 400, "A imagem deve ter no máximo 5 MB")
		return
	}
	mimeType := http.DetectContentType(data)
	extension, ok := allowedImages[mimeType]
	if !ok {
		writeError(w, 400, "Envie uma imagem PNG, JPG, WebP ou GIF")
		return
	}
	asset := Asset{ID: newID("asset"), Name: truncate(filepath.Base(header.Filename), 120), MimeType: mimeType, Path: newID("image") + extension, Data: data}
	if err := s.store.SaveAsset(r.Context(), asset); err != nil {
		s.fail(w, 500, err)
		return
	}
	writeJSON(w, 201, map[string]any{"id": asset.ID, "name": asset.Name, "mimeType": asset.MimeType, "path": asset.Path, "url": "/api/assets/files/" + asset.Path, "message": "Imagem enviada com sucesso"})
}

func (s *Server) assetFile(w http.ResponseWriter, r *http.Request) {
	asset, err := s.store.AssetByPath(r.Context(), filepath.Base(r.PathValue("filename")))
	if errorsIsNoRows(err) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	w.Header().Set("Content-Type", asset.MimeType)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	_, _ = w.Write(asset.Data)
}
func (s *Server) deleteAsset(w http.ResponseWriter, r *http.Request) {
	err := s.store.DeleteAsset(r.Context(), r.PathValue("id"))
	if err != nil && !errorsIsNoRows(err) {
		s.fail(w, 500, err)
		return
	}
	writeJSON(w, 200, messageResponse{OK: true, Message: "Imagem removida com sucesso"})
}

func (s *Server) pwaManifest(w http.ResponseWriter, r *http.Request) {
	dashboard, err := s.store.Dashboard(r.Context())
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	if r.PathValue("dashboardId") != dashboard.ID {
		http.NotFound(w, r)
		return
	}
	name := stringValue(dashboard.Branding["name"])
	if name == "" {
		name = dashboard.Name
	}
	background := validColor(dashboard.Branding["backgroundColor"], "#0b1017")
	theme := validColor(dashboard.Branding["accent"], background)
	hasIcon := stringValue(dashboard.Branding["favicon"]) != ""
	icon := func(size int, maskable bool) map[string]any {
		source := fmt.Sprintf("/icons/pwa-%d.png", size)
		purpose := "any"
		if maskable {
			source = fmt.Sprintf("/icons/pwa-maskable-%d.png", size)
			purpose = "maskable"
		}
		if hasIcon {
			source = fmt.Sprintf("/api/pwa/%s/icon/%d.png", dashboard.ID, size)
			if maskable {
				source += "?maskable=true"
			}
		}
		return map[string]any{"src": source, "sizes": fmt.Sprintf("%dx%d", size, size), "type": "image/png", "purpose": purpose}
	}
	manifest := map[string]any{"name": truncate(name, 80), "short_name": truncate(name, 24), "description": "Seu homelab, do seu jeito.", "lang": "pt-BR", "id": "/pwa/" + dashboard.ID + "/", "start_url": "/pwa/" + dashboard.ID + "/", "scope": "/pwa/" + dashboard.ID + "/", "display": "standalone", "orientation": "any", "background_color": background, "theme_color": theme, "icons": []any{icon(192, false), icon(512, false), icon(512, true)}}
	w.Header().Set("Content-Type", "application/manifest+json")
	w.Header().Set("Cache-Control", "private, no-cache, no-store, must-revalidate")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(manifest)
}

func (s *Server) pwaIcon(w http.ResponseWriter, r *http.Request) {
	dashboard, err := s.store.Dashboard(r.Context())
	if err != nil {
		s.fail(w, 500, err)
		return
	}
	if r.PathValue("dashboardId") != dashboard.ID {
		http.NotFound(w, r)
		return
	}
	file := r.PathValue("file")
	if !strings.HasSuffix(file, ".png") {
		http.NotFound(w, r)
		return
	}
	size, err := strconv.Atoi(strings.TrimSuffix(file, ".png"))
	if err != nil || (size != 192 && size != 512) {
		http.NotFound(w, r)
		return
	}
	favicon := stringValue(dashboard.Branding["favicon"])
	filename := strings.TrimPrefix(favicon, "/api/assets/files/")
	if filename == favicon || filename == "" {
		http.NotFound(w, r)
		return
	}
	asset, err := s.store.AssetByPath(r.Context(), filepath.Base(filename))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	source, _, err := image.Decode(bytes.NewReader(asset.Data))
	if err != nil {
		writeError(w, 400, "Ícone inválido")
		return
	}
	maskable := r.URL.Query().Get("maskable") == "true"
	contentSize := size
	if maskable {
		contentSize = int(float64(size) * .72)
	}
	destination := image.NewRGBA(image.Rect(0, 0, size, size))
	if maskable {
		draw.Draw(destination, destination.Bounds(), &image.Uniform{C: parseColor(validColor(dashboard.Branding["backgroundColor"], "#0b1017"))}, image.Point{}, draw.Src)
	}
	bounds := source.Bounds()
	scale := min(float64(contentSize)/float64(bounds.Dx()), float64(contentSize)/float64(bounds.Dy()))
	width, height := max(1, int(float64(bounds.Dx())*scale)), max(1, int(float64(bounds.Dy())*scale))
	left, top := (size-width)/2, (size-height)/2
	xdraw.CatmullRom.Scale(destination, image.Rect(left, top, left+width, top+height), source, bounds, draw.Over, nil)
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "private, no-cache, no-store, must-revalidate")
	_ = png.Encode(w, destination)
}

func validColor(value any, fallback string) string {
	text := stringValue(value)
	if len(text) == 7 && text[0] == '#' {
		if _, err := strconv.ParseUint(text[1:], 16, 24); err == nil {
			return text
		}
	}
	return fallback
}
func parseColor(value string) color.RGBA {
	number, _ := strconv.ParseUint(strings.TrimPrefix(value, "#"), 16, 24)
	return color.RGBA{R: uint8(number >> 16), G: uint8(number >> 8), B: uint8(number), A: 255}
}
func errorsIsNoRows(err error) bool { return err == sql.ErrNoRows }
