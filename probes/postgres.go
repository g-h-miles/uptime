package probes

import (
	"database/sql"
	"fmt"
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
	// Construct DSN from parts
	dsn := fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=disable", p.User, p.Pass, p.Addr, p.DB)
	if p.User == "" { // Handle case with no auth
		dsn = fmt.Sprintf("postgres://%s/%s?sslmode=disable", p.Addr, p.DB)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return Result{Target: p.Addr, Type: "postgres", Status: false, Duration: time.Since(start), CheckedAt: time.Now(), Message: err.Error()}
	}
	defer db.Close()
	err = db.Ping()
	duration := time.Since(start)
	if err != nil {
		return Result{Target: p.Addr, Type: "postgres", Status: false, Duration: duration, CheckedAt: time.Now(), Message: err.Error()}
	}
	return Result{Target: p.Addr, Type: "postgres", Status: true, Duration: duration, CheckedAt: time.Now()}
}
