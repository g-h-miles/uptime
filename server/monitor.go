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
				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
				log.Printf("📊 SERVICE: %s", t.Name)
				log.Printf("   Status: %v", res.Status)
				log.Printf("   ⚠️  SKIPPING - Not subscribed and no webhooks configured")
				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
				continue
			}

			statusMutex.Lock()
			previousStatus, ok := resourceStatus[t.Name]
			if !ok {
				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
				log.Printf("🆕 NEW SERVICE: %s", t.Name)
				log.Printf("   Initializing status tracking - assuming service starts UP")
				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
				previousStatus = true
				resourceStatus[t.Name] = true // BUG FIX: Initialize the map entry!
				consecutiveFailures[t.Name] = 0
			}

			if !currentStatus {
				// Check failed
				consecutiveFailures[t.Name]++

				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
				log.Printf("❌ SERVICE DOWN: %s (%s)", t.Name, t.URL)
				log.Printf("   Current status: DOWN")
				log.Printf("   Previous status: %s", map[bool]string{true: "UP", false: "DOWN"}[previousStatus])
				log.Printf("   Consecutive failures: %d of %d required", consecutiveFailures[t.Name], failureThreshold)

				if consecutiveFailures[t.Name] < failureThreshold {
					log.Printf("   ⏳ WAITING - Need %d more failure(s) before triggering alerts", failureThreshold-consecutiveFailures[t.Name])
					log.Printf("   📝 Next check will be failure #%d", consecutiveFailures[t.Name]+1)
				}

				// Trigger DOWN notification/webhook if threshold reached AND not already marked down
				if consecutiveFailures[t.Name] >= failureThreshold && previousStatus {
					log.Printf("   🚨 THRESHOLD REACHED - %s has failed %d consecutive times!", t.Name, consecutiveFailures[t.Name])
					log.Printf("   🔔 Triggering DOWN actions now...")

					// Send Telegram notification if subscribed
					if t.Subscribed {
						log.Printf("   📱 Sending Telegram DOWN notification")
						notifyDown(t.Name)
					} else {
						log.Printf("   📱 Telegram notification: SKIPPED (not subscribed)")
					}

					// Call webhook if configured
					if t.OnDown != "" {
						log.Printf("   🪝 Calling onDown webhook: %s", t.OnDown)
						callWebhook(t.OnDown)
					} else {
						log.Printf("   🪝 onDown webhook: SKIPPED (not configured)")
					}

					resourceStatus[t.Name] = false
					log.Printf("   ✅ Service marked as DOWN in status tracking")
				} else if !previousStatus {
					log.Printf("   ℹ️  Service already marked as DOWN - no duplicate notifications sent")
				}
				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			} else {
				// Check succeeded
				wasDown := !previousStatus || consecutiveFailures[t.Name] >= failureThreshold

				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
				log.Printf("✅ SERVICE UP: %s (%s)", t.Name, t.URL)
				log.Printf("   Current status: UP")
				log.Printf("   Previous status: %s", map[bool]string{true: "UP", false: "DOWN"}[previousStatus])

				if consecutiveFailures[t.Name] > 0 {
					log.Printf("   🔄 Resetting failure counter from %d to 0", consecutiveFailures[t.Name])
				}
				consecutiveFailures[t.Name] = 0 // Reset failure counter

				if wasDown {
					log.Printf("   🎉 RECOVERY DETECTED - Service is back up!")
					log.Printf("   🔔 Triggering UP actions now...")

					// Send Telegram notification if subscribed
					if t.Subscribed {
						log.Printf("   📱 Sending Telegram UP notification")
						notifyUp(t.Name)
					} else {
						log.Printf("   📱 Telegram notification: SKIPPED (not subscribed)")
					}

					// Call webhook if configured
					if t.OnUp != "" {
						log.Printf("   🪝 Calling onUp webhook: %s", t.OnUp)
						callWebhook(t.OnUp)
					} else {
						log.Printf("   🪝 onUp webhook: SKIPPED (not configured)")
					}

					resourceStatus[t.Name] = true
					log.Printf("   ✅ Service marked as UP in status tracking")
				} else {
					log.Printf("   ℹ️  Service remains UP - no alerts needed")
				}
				log.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
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
