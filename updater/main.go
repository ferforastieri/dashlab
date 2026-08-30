package main

import (
	"crypto/subtle"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type updater struct {
	token   string
	mu      sync.Mutex
	running bool
}

func main() {
	token := strings.TrimSpace(os.Getenv("UPDATE_TOKEN"))
	if token == "" {
		slog.Error("UPDATE_TOKEN is required")
		os.Exit(1)
	}
	u := &updater{token: token}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/update", u.update)
	server := &http.Server{Addr: ":8080", Handler: u.auth(mux), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second}
	slog.Info("updater started", "address", server.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("http server", "error", err)
		os.Exit(1)
	}
}

func (u *updater) auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		value := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if subtle.ConstantTimeCompare([]byte(value), []byte(u.token)) != 1 {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (u *updater) update(w http.ResponseWriter, _ *http.Request) {
	u.mu.Lock()
	if u.running {
		u.mu.Unlock()
		http.Error(w, "update already running", http.StatusConflict)
		return
	}
	u.running = true
	u.mu.Unlock()
	w.WriteHeader(http.StatusAccepted)
	go func() {
		defer func() { u.mu.Lock(); u.running = false; u.mu.Unlock() }()
		base := []string{"compose", "--project-directory", "/workspace", "--env-file", "/workspace/.env", "-f", "/workspace/docker-compose.yml"}
		for _, args := range [][]string{{"pull", "dashlab-plus"}, {"up", "-d", "--no-build", "dashlab-plus"}} {
			cmd := exec.Command("docker", append(base, args...)...)
			if output, err := cmd.CombinedOutput(); err != nil {
				slog.Error("update failed", "error", err, "output", string(output))
				return
			}
		}
		slog.Info("update completed")
	}()
}
