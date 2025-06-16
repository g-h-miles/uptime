package storage

import (
	"database/sql"
	"strings"
	"time"

	"uptime/probes"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

// MonitorTarget combines probe with metadata
type MonitorTarget struct {
	Probe      probes.Target
	Name       string
	URL        string
	Subscribed bool
}

func Init() error {
	var err error
	db, err = sql.Open("sqlite3", "/persistent/monitor.db")
	if err != nil {
		return err
	}
	return createSchema()
}

func createSchema() error {
	_, err := db.Exec(`
        CREATE TABLE IF NOT EXISTS checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target TEXT,
        type TEXT,
        status INTEGER,
        duration INTEGER,
        checked_at DATETIME,
        message TEXT
    );
        CREATE TABLE IF NOT EXISTS targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                url TEXT,
                type TEXT,
                username TEXT,
                password TEXT,
                subscribed INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY,
                frequency INTEGER,
                timeframe INTEGER
        );
        `)
	if err != nil {
		return err
	}

	// Attempt to add subscribed column if missing
	_, err = db.Exec(`ALTER TABLE targets ADD COLUMN subscribed INTEGER DEFAULT 0`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}

	// Insert default settings if not exist
	_, err = db.Exec(`INSERT INTO settings(id, frequency, timeframe) VALUES(1, 60, 24) ON CONFLICT(id) DO NOTHING`)
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

func GetTargets() ([]MonitorTarget, error) {
	rows, err := db.Query(`SELECT id, name, url, type, username, password, subscribed FROM targets`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []MonitorTarget
	for rows.Next() {
		var id int
		var name, url, typ string
		var username, password sql.NullString // Use sql.NullString for nullable columns
		var subscribed int
		if err := rows.Scan(&id, &name, &url, &typ, &username, &password, &subscribed); err != nil {
			return nil, err
		}
		var probe probes.Target
		switch typ {
		case "http":
			probe = probes.HTTP{URL: url}
		case "postgres":
			probe = probes.Postgres{Addr: url, User: username.String, Pass: password.String, DB: "postgres"}
		case "redis":
			probe = probes.Redis{Addr: url, User: username.String, Pass: password.String}
		}
		targets = append(targets, MonitorTarget{Probe: probe, Name: name, URL: url, Subscribed: subscribed == 1})
	}

	if len(targets) == 0 {
		return insertDefaultTargets()
	}

	return targets, nil
}

func insertDefaultTargets() ([]MonitorTarget, error) {
	defaultTargets := []struct {
		Name string
		URL  string
		Type string
	}{
		{"Google", "https://www.google.com", "http"},
		{"GitHub", "https://github.com", "http"},
		// The DSNs are now simplified, credentials will be handled separately
		{"Postgres", "localhost:5432", "postgres"},
		{"Redis", "localhost:6379", "redis"},
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	// Add username and password to the insert statement
	stmt, err := tx.Prepare("INSERT INTO targets(name, url, type, username, password, subscribed) VALUES(?, ?, ?, ?, ?, 0)")
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var targets []MonitorTarget
	for _, t := range defaultTargets {
		var user, pass string
		// Add dummy credentials for local DBs for the defaults
		if t.Type == "postgres" {
			user = "user"
			pass = "pass"
		}
		// Executing with nil for username/password for http targets
		if _, err := stmt.Exec(t.Name, t.URL, t.Type, user, pass); err != nil {
			tx.Rollback()
			return nil, err
		}
		var probe probes.Target
		switch t.Type {
		case "http":
			probe = probes.HTTP{URL: t.URL}
		case "postgres":
			probe = probes.Postgres{Addr: t.URL, User: user, Pass: pass, DB: "postgres"}
		case "redis":
			probe = probes.Redis{Addr: t.URL, User: user, Pass: pass}
		}
		targets = append(targets, MonitorTarget{Probe: probe, Name: t.Name, URL: t.URL, Subscribed: false})
	}
	tx.Commit()

	return targets, nil
}

type TargetInfo struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	URL        string `json:"url"`
	Type       string `json:"type"`
	Username   string `json:"username,omitempty"`
	Subscribed bool   `json:"subscribed"`
	// Password is intentionally omitted for security
}

func GetTargetInfos() ([]TargetInfo, error) {
	// Select the new columns but don't expose password
	rows, err := db.Query(`SELECT id, name, url, type, username, subscribed FROM targets ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []TargetInfo
	for rows.Next() {
		var t TargetInfo
		var subscribed int
		if err := rows.Scan(&t.ID, &t.Name, &t.URL, &t.Type, &t.Username, &subscribed); err != nil {
			return nil, err
		}
		t.Subscribed = subscribed == 1
		targets = append(targets, t)
	}
	return targets, nil
}

func AddTarget(name, url, typ, username, password string) error {
	_, err := db.Exec("INSERT INTO targets(name, url, type, username, password, subscribed) VALUES(?, ?, ?, ?, ?, 0)", name, url, typ, username, password)
	return err
}

func UpdateTarget(id int, name, url, typ, username, password string) error {
	// Only update password if a new one is provided.
	if password != "" {
		_, err := db.Exec("UPDATE targets SET name = ?, url = ?, type = ?, username = ?, password = ? WHERE id = ?", name, url, typ, username, password, id)
		return err
	}
	_, err := db.Exec("UPDATE targets SET name = ?, url = ?, type = ?, username = ? WHERE id = ?", name, url, typ, username, id)
	return err
}

func DeleteTarget(id int) error {
	_, err := db.Exec("DELETE FROM targets WHERE id = ?", id)
	return err
}

func SubscribeTarget(id int) error {
	_, err := db.Exec("UPDATE targets SET subscribed = 1 WHERE id = ?", id)
	return err
}

func ClearChecks(target string) error {
	_, err := db.Exec("DELETE FROM checks WHERE target = ?", target)
	return err
}

// LastChecks returns all checks within timeframe hours
func LastChecks(hours int) ([]probes.Result, error) {
	start := time.Now().Add(-time.Duration(hours) * time.Hour)
	rows, err := db.Query(`SELECT target, type, status, duration, checked_at, message FROM checks WHERE checked_at >= ? ORDER BY checked_at DESC`, start)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []probes.Result
	for rows.Next() {
		var r probes.Result
		var status int
		var duration int64
		var checkedAtStr string
		if err := rows.Scan(&r.Target, &r.Type, &status, &duration, &checkedAtStr, &r.Message); err != nil {
			return nil, err
		}
		r.Status = status == 1
		r.Duration = time.Duration(duration) * time.Millisecond
		// Parse the timestamp with microseconds and timezone
		if parsedTime, err := time.Parse("2006-01-02 15:04:05.999999-07:00", checkedAtStr); err == nil {
			r.CheckedAt = parsedTime
		} else if parsedTime, err := time.Parse(time.RFC3339, checkedAtStr); err == nil {
			r.CheckedAt = parsedTime
		} else {
			// Fallback to current time if parsing fails
			r.CheckedAt = time.Now()
		}
		res = append(res, r)
	}
	return res, nil
}

// Settings persistence
type Settings struct {
	Frequency      int
	TimeframeHours int
}

func GetSettings() (*Settings, error) {
	row := db.QueryRow("SELECT frequency, timeframe FROM settings WHERE id=1")
	var s Settings
	if err := row.Scan(&s.Frequency, &s.TimeframeHours); err != nil {
		return nil, err
	}
	return &s, nil
}

func UpdateSettings(freq, timeframe int) error {
	res, err := db.Exec("UPDATE settings SET frequency=?, timeframe=? WHERE id=1", freq, timeframe)
	if err != nil {
		return err
	}
	c, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if c == 0 {
		_, err = db.Exec("INSERT INTO settings(id, frequency, timeframe) VALUES(1, ?, ?)", freq, timeframe)
	}
	return err
}
