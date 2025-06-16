package storage

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"uptime/probes"
)

var db *sql.DB

func Init() error {
	var err error
	db, err = sql.Open("sqlite3", "monitor.db")
	if err != nil {
		return err
	}
	return createSchema()
}

func createSchema() error {
	sqlStmt := `CREATE TABLE IF NOT EXISTS checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target TEXT,
        type TEXT,
        status INTEGER,
        duration INTEGER,
        checked_at DATETIME,
        message TEXT
    );`
	_, err := db.Exec(sqlStmt)
	return err
}

func SaveCheck(res probes.Result) error {
	_, err := db.Exec(`INSERT INTO checks (target, type, status, duration, checked_at, message)
        VALUES (?, ?, ?, ?, ?, ?)`, res.Target, res.Type, boolToInt(res.Status), res.Duration.Milliseconds(), res.CheckedAt, res.Message)
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// LastChecks returns all checks within timeframe hours
func LastChecks(hours int) ([]probes.Result, error) {
	rows, err := db.Query(`SELECT target, type, status, duration, checked_at, message FROM checks
        WHERE checked_at >= datetime('now', ?) ORDER BY checked_at DESC`, fmt.Sprintf("-%dh", hours))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []probes.Result
	for rows.Next() {
		var r probes.Result
		var status int
		var duration int64
		if err := rows.Scan(&r.Target, &r.Type, &status, &duration, &r.CheckedAt, &r.Message); err != nil {
			return nil, err
		}
		r.Status = status == 1
		r.Duration = time.Duration(duration) * time.Millisecond
		res = append(res, r)
	}
	return res, nil
}
