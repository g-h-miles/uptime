package probes

import (
	"net/http"
	"time"
)

var httpClient = &http.Client{
	Timeout:   10 * time.Second,
	Transport: &http.Transport{Proxy: nil},
}

// HTTP target

type HTTP struct {
	URL string
}

func (h HTTP) Check() Result {
	start := time.Now()
	resp, err := httpClient.Get(h.URL)
	duration := time.Since(start)
	if err != nil {
		return Result{Target: h.URL, Type: "http", Status: false, Duration: duration, CheckedAt: time.Now(), Message: err.Error()}
	}
	resp.Body.Close()
	ok := resp.StatusCode == 200
	return Result{Target: h.URL, Type: "http", Status: ok, Duration: duration, CheckedAt: time.Now(), Message: resp.Status}
}
