package probes

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

var httpClient = &http.Client{
	Timeout:   10 * time.Second,
	Transport: &http.Transport{Proxy: nil},
}

// HTTP target

type HTTP struct {
	URL          string
	RetryAttempts int
}

func (h HTTP) Check() Result {
	retries := h.RetryAttempts
	if retries <= 0 {
		retries = 3 // Default to 3 attempts
	}

	var lastErr error
	var lastStatus string
	var lastStatusCode int

	for attempt := 1; attempt <= retries; attempt++ {
		start := time.Now()
		resp, err := httpClient.Get(h.URL)
		duration := time.Since(start)

		if err != nil {
			lastErr = err
			log.Printf("[HTTP] %s - Attempt %d/%d failed: %v (took %v)", h.URL, attempt, retries, err, duration)
			if attempt < retries {
				time.Sleep(2 * time.Second) // Wait 2s between retries
				continue
			}
			return Result{
				Target:    h.URL,
				Type:      "http",
				Status:    false,
				Duration:  duration,
				CheckedAt: time.Now(),
				Message:   fmt.Sprintf("All %d attempts failed. Last error: %v", retries, err),
			}
		}
		resp.Body.Close()

		lastStatus = resp.Status
		lastStatusCode = resp.StatusCode

		// Accept any 2xx status code as success
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			log.Printf("[HTTP] %s - SUCCESS: %s (took %v)", h.URL, resp.Status, duration)
			return Result{
				Target:    h.URL,
				Type:      "http",
				Status:    true,
				Duration:  duration,
				CheckedAt: time.Now(),
				Message:   resp.Status,
			}
		}

		log.Printf("[HTTP] %s - Attempt %d/%d: %s (took %v)", h.URL, attempt, retries, resp.Status, duration)
		if attempt < retries {
			time.Sleep(2 * time.Second) // Wait 2s between retries
		}
	}

	// All retries exhausted with non-2xx responses
	return Result{
		Target:    h.URL,
		Type:      "http",
		Status:    false,
		Duration:  0,
		CheckedAt: time.Now(),
		Message:   fmt.Sprintf("All %d attempts returned non-2xx status. Last: %s (code %d)", retries, lastStatus, lastStatusCode),
	}
}
