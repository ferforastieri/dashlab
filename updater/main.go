package main

import (
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"
)

type updater struct {
	mu      sync.Mutex
	running bool
}

func main() {
	u := &updater{}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/update", u.update)
	server := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second}
	slog.Info("updater started")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("http server", "error", err)
		os.Exit(1)
	}
}
func (u *updater) update(w http.ResponseWriter, _ *http.Request) {
	u.mu.Lock()
	if u.running {
		u.mu.Unlock()
		http.Error(w, "update already running", 409)
		return
	}
	u.running = true
	u.mu.Unlock()
	w.WriteHeader(202)
	go func() {
		defer func() { u.mu.Lock(); u.running = false; u.mu.Unlock() }()
		base := []string{"compose", "--project-directory", "/workspace", "-f", "/workspace/docker-compose.yml"}
		for _, args := range [][]string{{"pull", "dashlab-plus"}, {"up", "-d", "--no-build", "dashlab-plus"}} {
			if out, err := exec.Command("docker", append(base, args...)...).CombinedOutput(); err != nil {
				slog.Error("update failed", "error", err, "output", string(out))
				return
			}
		}
	}()
}
