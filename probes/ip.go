package probes

import (
	"fmt"
	"log"
	"net"
	"time"
)

// IP target - checks if a device is reachable on the network
// Uses TCP connection attempt as a reliable cross-platform check
type IP struct {
	Address       string
	RetryAttempts int
}

func (i IP) Check() Result {
	retries := i.RetryAttempts
	if retries <= 0 {
		retries = 3 // Default to 3 attempts
	}

	var lastError error

	for attempt := 1; attempt <= retries; attempt++ {
		start := time.Now()

		// Try common ports in order: 443 (HTTPS), 80 (HTTP), 22 (SSH)
		ports := []string{"443", "80", "22"}

		for _, port := range ports {
			conn, err := net.DialTimeout("tcp", net.JoinHostPort(i.Address, port), 3*time.Second)
			if err == nil {
				conn.Close()
				duration := time.Since(start)
				log.Printf("[IP] %s - SUCCESS: Device is reachable on port %s (took %v)", i.Address, port, duration)
				return Result{
					Target:    i.Address,
					Type:      "ip",
					Status:    true,
					Duration:  duration,
					CheckedAt: time.Now(),
					Message:   fmt.Sprintf("Reachable on port %s", port),
				}
			}
			lastError = err
		}

		duration := time.Since(start)
		log.Printf("[IP] %s - Attempt %d/%d failed: device not reachable on any common port (took %v)", i.Address, attempt, retries, duration)

		if attempt < retries {
			time.Sleep(2 * time.Second) // Wait 2s between retries
		}
	}

	return Result{
		Target:    i.Address,
		Type:      "ip",
		Status:    false,
		Duration:  0,
		CheckedAt: time.Now(),
		Message:   fmt.Sprintf("All %d attempts failed. Device not reachable. Last error: %v", retries, lastError),
	}
}
