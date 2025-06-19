package probes

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

type Postgres struct {
	Addr string
	User string
	Pass string
	DB   string
}

func (p Postgres) Check() Result {
	start := time.Now()

	// Parse existing query parameters from Addr
	addr := p.Addr
	existingParams := ""
	if parts := strings.SplitN(p.Addr, "?", 2); len(parts) == 2 {
		addr = parts[0]
		existingParams = parts[1]
	}

	// Build query parameters
	params := []string{"connect_timeout=10"}
	if existingParams != "" {
		// If there are existing params, check if sslmode is already set
		if !strings.Contains(existingParams, "sslmode=") {
			params = append(params, "sslmode=disable")
		}
		params = append([]string{existingParams}, params...)
	} else {
		// No existing params, add default sslmode
		params = append(params, "sslmode=disable")
	}

	queryString := strings.Join(params, "&")

	var dsn string
	if p.User != "" && p.Pass != "" {
		// Check if addr already contains a database path (has a slash after the host:port)
		if strings.Contains(addr, "/") && !strings.HasSuffix(addr, "/") {
			// Addr already contains database name
			dsn = fmt.Sprintf("postgres://%s:%s@%s?%s", p.User, p.Pass, addr, queryString)
		} else {
			// Need to append database name
			dbName := p.DB
			if dbName == "" {
				dbName = "postgres"
			}
			// Remove trailing slash if present
			addr = strings.TrimSuffix(addr, "/")
			dsn = fmt.Sprintf("postgres://%s:%s@%s/%s?%s", p.User, p.Pass, addr, dbName, queryString)
		}
	} else {
		dbName := p.DB
		if dbName == "" {
			dbName = "postgres"
		}
		dsn = fmt.Sprintf("postgres://%s/%s?%s", addr, dbName, queryString)
	}

	// Debug logging
	// log.Printf("Postgres probe: connecting to %s (target: %s)", dsn, p.Addr)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		// log.Printf("Postgres probe: sql.Open failed for %s: %v", p.Addr, err)
		return Result{Target: p.Addr, Type: "postgres", Status: false, Duration: time.Since(start), CheckedAt: time.Now(), Message: err.Error()}
	}
	defer db.Close()

	err = db.Ping()
	duration := time.Since(start)
	if err != nil {
		// log.Printf("Postgres probe: db.Ping failed for %s: %v", p.Addr, err)
		return Result{Target: p.Addr, Type: "postgres", Status: false, Duration: duration, CheckedAt: time.Now(), Message: err.Error()}
	}

	// log.Printf("Postgres probe: SUCCESS for %s in %v", p.Addr, duration)
	return Result{Target: p.Addr, Type: "postgres", Status: true, Duration: duration, CheckedAt: time.Now()}
}
