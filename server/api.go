package server

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"uptime/storage"
)

var mu sync.RWMutex
var settings = &Settings{Frequency: 60, TimeframeHours: 24}

func registerAPI(mux *http.ServeMux) {
	mux.HandleFunc("/api/checks", handleChecks)
	mux.HandleFunc("/api/settings", handleSettings)
}

func handleChecks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		data, err := storage.LastChecks(settings.TimeframeHours)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(data)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		mu.RLock()
		defer mu.RUnlock()
		json.NewEncoder(w).Encode(settings)
	case http.MethodPost:
		var s Settings
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		mu.Lock()
		settings = &s
		mu.Unlock()
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// Settings for monitor frequency and timeframe
type Settings struct {
	Frequency      int `json:"frequency"` // seconds
	TimeframeHours int `json:"timeframeHours"`
}

func GetFrequency() time.Duration {
	mu.RLock()
	defer mu.RUnlock()
	return time.Duration(settings.Frequency) * time.Second
}
