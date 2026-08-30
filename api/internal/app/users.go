package app

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	CreatedAt string `json:"createdAt"`
}
type authContextKey struct{}
type authIdentity struct{ Username, Role string }

func (s *Store) ensureUsers(ctx context.Context) error {
	if _, err := s.db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL)`); err != nil {
		return err
	}
	return nil
}

func (s *Store) authenticateUser(ctx context.Context, username, password string) (authIdentity, bool) {
	var hash, role string
	if err := s.db.QueryRowContext(ctx, `SELECT password_hash, role FROM users WHERE username=?`, username).Scan(&hash, &role); err != nil {
		return authIdentity{}, false
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return authIdentity{}, false
	}
	return authIdentity{Username: username, Role: role}, true
}

func (s *Store) createSession(ctx context.Context, token string, identity authIdentity, expiresAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, err := s.db.ExecContext(ctx, `DELETE FROM auth_sessions WHERE expires_at <= ?`, time.Now().UTC().Unix()); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO auth_sessions(token,username,role,expires_at) VALUES(?,?,?,?)`, token, identity.Username, identity.Role, expiresAt.UTC().Unix())
	return err
}

func (s *Store) sessionIdentity(ctx context.Context, token string) (authIdentity, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var identity authIdentity
	var expiresAt int64
	if err := s.db.QueryRowContext(ctx, `SELECT username,role,expires_at FROM auth_sessions WHERE token=?`, token).Scan(&identity.Username, &identity.Role, &expiresAt); err != nil {
		return authIdentity{}, false
	}
	if expiresAt <= time.Now().UTC().Unix() {
		_, _ = s.db.ExecContext(ctx, `DELETE FROM auth_sessions WHERE token=?`, token)
		return authIdentity{}, false
	}
	return identity, true
}

func (s *Store) deleteSessionsForUser(ctx context.Context, username string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.ExecContext(ctx, `DELETE FROM auth_sessions WHERE username=?`, username)
	return err
}

func (s *Store) users(ctx context.Context) ([]User, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,username,role,created_at FROM users ORDER BY username`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, u)
	}
	return result, rows.Err()
}

func (s *Store) createUser(ctx context.Context, username, password, role string) (User, error) {
	username = strings.TrimSpace(username)
	if len(username) < 3 || len(username) > 64 || password == "" || (role != "admin" && role != "user") {
		return User{}, errors.New("invalid user")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	u := User{ID: newID("user"), Username: username, Role: role, CreatedAt: time.Now().UTC().Format(time.RFC3339)}
	_, err = s.db.ExecContext(ctx, `INSERT INTO users(id,username,password_hash,role,created_at) VALUES(?,?,?,?,?)`, u.ID, u.Username, string(hash), u.Role, u.CreatedAt)
	return u, err
}

func randomSession() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
