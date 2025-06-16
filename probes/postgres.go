package probes

import (
	"database/sql"
	_ "github.com/lib/pq"
	"time"
)

type Postgres struct {
	DSN string
}

func (p Postgres) Check() Result {
	start := time.Now()
	db, err := sql.Open("postgres", p.DSN)
	if err != nil {
		return Result{Target: p.DSN, Type: "postgres", Status: false, Duration: time.Since(start), CheckedAt: time.Now(), Message: err.Error()}
	}
	defer db.Close()
	err = db.Ping()
	duration := time.Since(start)
	if err != nil {
		return Result{Target: p.DSN, Type: "postgres", Status: false, Duration: duration, CheckedAt: time.Now(), Message: err.Error()}
	}
	return Result{Target: p.DSN, Type: "postgres", Status: true, Duration: duration, CheckedAt: time.Now()}
}
