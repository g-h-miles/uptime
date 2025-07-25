package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"uptime/probes"
	"uptime/storage"

	"github.com/g-h-miles/httpmux"
)

var mu sync.RWMutex
var settings = &Settings{Frequency: 60, TimeframeHours: 24}

type CheckResponse struct {
	Target    string    `json:"target"`
	Type      string    `json:"type"`
	Status    bool      `json:"status"`
	Duration  int64     `json:"duration"` // milliseconds
	CheckedAt time.Time `json:"checkedAt"`
	Message   string    `json:"message"`
}

func registerAPI(mux *httpmux.Router) {
	mux.GET("/checks", handleChecks)
	mux.GET("/settings", handleSettings)
	mux.POST("/settings", handleSettings)
	mux.GET("/targets", handleTargets)
	mux.POST("/targets", handleTargets)
	mux.PUT("/targets", handleTargets)
	mux.DELETE("/targets", handleTargets)
	mux.POST("/targets/clear", handleClear)
	mux.POST("/targets/subscribe", handleSubscribe)
	mux.POST("/targets/unsubscribe", handleUnsubscribe)
	mux.POST("/test-telegram", handleTestTelegram)
}

func handleChecks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		data, err := storage.LastChecks(settings.TimeframeHours)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		// Convert data to CheckResponse to send duration in milliseconds
		response_data := make([]CheckResponse, len(data))
		for i, d := range data {
			response_data[i] = CheckResponse{
				Target:    d.Target,
				Type:      d.Type,
				Status:    d.Status,
				Duration:  d.Duration.Milliseconds(), // Convert to ms
				CheckedAt: d.CheckedAt,
				Message:   d.Message,
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response_data)
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
		_ = storage.UpdateSettings(s.Frequency, s.TimeframeHours)
		ResetMonitorLoop() // Trigger an immediate loop reset
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleTargets(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		targets, err := storage.GetTargetInfos()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(targets)
	case http.MethodPost:
		var t struct {
			Name     string `json:"name"`
			URL      string `json:"url"`
			Type     string `json:"type"`
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := storage.AddTarget(t.Name, t.URL, t.Type, t.Username, t.Password); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Perform an immediate check in the background
		go func() {
			var probe probes.Target
			switch t.Type {
			case "http":
				probe = probes.HTTP{URL: t.URL}
			case "postgres":
				probe = probes.Postgres{Addr: t.URL, User: t.Username, Pass: t.Password, DB: "postgres"}
			case "redis":
				probe = probes.Redis{Addr: t.URL, User: t.Username, Pass: t.Password}
			}
			if probe != nil {
				res := probe.Check()
				if err := storage.SaveCheck(res); err != nil {
					log.Println("save error on initial check:", err)
				}
			}
		}()

		w.WriteHeader(http.StatusCreated)
	case http.MethodPut:
		var t struct {
			ID       int    `json:"id"`
			Name     string `json:"name"`
			URL      string `json:"url"`
			Type     string `json:"type"`
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := storage.UpdateTarget(t.ID, t.Name, t.URL, t.Type, t.Username, t.Password); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		// Reset the loop to apply changes immediately
		ResetMonitorLoop()
		w.WriteHeader(http.StatusOK)
	case http.MethodDelete:
		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
		if err := storage.DeleteTarget(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleClear(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	target := r.URL.Query().Get("target")
	if target == "" {
		http.Error(w, "missing target", http.StatusBadRequest)
		return
	}
	if err := storage.ClearChecks(target); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleSubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := storage.SubscribeTarget(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleUnsubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := storage.UnsubscribeTarget(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleTestTelegram(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	testTelegram()
	w.WriteHeader(http.StatusOK)
}

// Settings for monitor frequency and timeframe
type Settings struct {
	Frequency      int `json:"frequency"` // seconds
	TimeframeHours int `json:"timeframeHours"`
}

func GetFrequency() time.Duration {
	return time.Duration(settings.Frequency) * time.Second
}
