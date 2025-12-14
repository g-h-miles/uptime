package server

import (
	"log"
	"sync"
	"time"

	"uptime/storage"
)

var (
	once                sync.Once
	monitorResetChan    = make(chan struct{}, 1)
	resourceStatus      = make(map[string]bool)
	consecutiveFailures = make(map[string]int)
	statusMutex         sync.Mutex
)

// ResetMonitorLoop sends a signal to reset the monitor loop, breaking any current sleep.
func ResetMonitorLoop() {
	select {
	case monitorResetChan <- struct{}{}:
	default:
		// Channel is full, a reset is already pending.
	}
}

func StartMonitoring() {
	once.Do(func() {
		go monitorLoop()
	})
}

func monitorLoop() {
	for {
		targets, err := storage.GetTargets()
		if err != nil {
			log.Println("error getting targets:", err)
			time.Sleep(GetFrequency()) // Sleep even on error to prevent fast error loops
			continue
		}

		freq := GetFrequency()
		failureThreshold := storage.GetFailureThreshold()

		for _, t := range targets {
			res := t.Probe.Check()
			if err := storage.SaveCheck(res); err != nil {
				log.Println("save error:", err)
			}

			// Track status changes for both notifications and webhooks
			currentStatus := res.Status
			hasWebhooks := t.OnDown != "" || t.OnUp != ""

			// Skip status tracking if not subscribed AND no webhooks configured
			if !t.Subscribed && !hasWebhooks {
				log.Printf("[MONITOR] %s: status=%v, skipping (not subscribed, no webhooks)", t.Name, res.Status)
				continue
			}

			log.Printf("[MONITOR] %s: status=%v, subscribed=%v, hasWebhooks=%v", t.Name, res.Status, t.Subscribed, hasWebhooks)

			statusMutex.Lock()
			previousStatus, ok := resourceStatus[t.Name]
			if !ok {
				log.Printf("[MONITOR] %s: initializing status tracking (assuming UP)", t.Name)
				previousStatus = true
				consecutiveFailures[t.Name] = 0
			}

			if !currentStatus {
				// Check failed
				consecutiveFailures[t.Name]++
				log.Printf("[MONITOR] %s: CHECK FAILED - consecutive: %d/%d, previousStatus=%v",
					t.Name, consecutiveFailures[t.Name], failureThreshold, previousStatus)

				// Trigger DOWN notification/webhook if threshold reached AND not already marked down
				if consecutiveFailures[t.Name] >= failureThreshold && previousStatus {
					log.Printf("[MONITOR] %s: THRESHOLD REACHED - triggering DOWN actions", t.Name)

					// Send Telegram notification if subscribed
					if t.Subscribed {
						log.Printf("[MONITOR] %s: sending Telegram DOWN notification", t.Name)
						notifyDown(t.Name)
					}

					// Call webhook if configured
					if t.OnDown != "" {
						log.Printf("[MONITOR] %s: calling onDown webhook: %s", t.Name, t.OnDown)
						callWebhook(t.OnDown)
					}

					resourceStatus[t.Name] = false
				} else if !previousStatus {
					log.Printf("[MONITOR] %s: already DOWN, skipping duplicate notifications", t.Name)
				}
			} else {
				// Check succeeded
				wasDown := !previousStatus || consecutiveFailures[t.Name] >= failureThreshold
				consecutiveFailures[t.Name] = 0 // Reset failure counter

				log.Printf("[MONITOR] %s: CHECK SUCCEEDED - wasDown=%v", t.Name, wasDown)

				if wasDown {
					log.Printf("[MONITOR] %s: RECOVERED - triggering UP actions", t.Name)

					// Send Telegram notification if subscribed
					if t.Subscribed {
						log.Printf("[MONITOR] %s: sending Telegram UP notification", t.Name)
						notifyUp(t.Name)
					}

					// Call webhook if configured
					if t.OnUp != "" {
						log.Printf("[MONITOR] %s: calling onUp webhook: %s", t.Name, t.OnUp)
						callWebhook(t.OnUp)
					}

					resourceStatus[t.Name] = true
				}
			}

			statusMutex.Unlock()
		}

		select {
		case <-time.After(freq):
		case <-monitorResetChan:
			// Settings have changed, loop immediately.
		}
	}
}
