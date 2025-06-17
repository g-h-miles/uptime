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
	var dsn string
	if p.User != "" && p.Pass != "" {
		dsn = fmt.Sprintf("postgres://%s:%s@%s", p.User, p.Pass, p.Addr)
	} else {
		dsn = fmt.Sprintf("postgres://%s", p.Addr)
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
