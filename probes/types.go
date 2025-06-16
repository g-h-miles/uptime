package probes

import "time"

// Result returned by a check
// Status true for success, false for failure
// Duration time taken
// Target string describing what was checked
// CheckedAt timestamp
// Message optional message for errors
// Type string website/postgres/redis

type Result struct {
	Target    string        `json:"target"`
	Type      string        `json:"type"`
	Status    bool          `json:"status"`
	Duration  time.Duration `json:"duration"`
	CheckedAt time.Time     `json:"checkedAt"`
	Message   string        `json:"message"`
}

// Target interface for different check types
// Implement Check returning Result

type Target interface {
	Check() Result
}
