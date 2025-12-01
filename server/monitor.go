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
			if t.Subscribed {
				currentStatus := res.Status
				statusMutex.Lock()
				previousStatus, ok := resourceStatus[t.Name]
				if !ok {
					previousStatus = true
					consecutiveFailures[t.Name] = 0
				}

				if !currentStatus {
					// Check failed
					consecutiveFailures[t.Name]++
					log.Printf("Resource '%s' check failed. Consecutive failures: %d/%d",
						t.Name, consecutiveFailures[t.Name], failureThreshold)

					// Only notify if we've reached the failure threshold AND we haven't already marked it down
					if consecutiveFailures[t.Name] >= failureThreshold && previousStatus {
						log.Printf("Resource '%s' exceeded failure threshold, sending DOWN notification.", t.Name)
						notifyDown(t.Name)
						resourceStatus[t.Name] = false
					}
				} else {
					// Check succeeded
					wasDown := !previousStatus || consecutiveFailures[t.Name] >= failureThreshold
					consecutiveFailures[t.Name] = 0 // Reset failure counter

					if wasDown {
						log.Printf("Resource '%s' is back up, sending UP notification.", t.Name)
						notifyUp(t.Name)
						resourceStatus[t.Name] = true
					}
				}

				statusMutex.Unlock()
			}
		}

		select {
		case <-time.After(freq):
		case <-monitorResetChan:
			// Settings have changed, loop immediately.
		}
	}
}
