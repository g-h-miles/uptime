package server

import (
	"log"
	"sync"
	"time"

	"uptime/storage"
)

var (
	once             sync.Once
	monitorResetChan = make(chan struct{}, 1)
	resourceStatus = make(map[string]bool)
	statusMutex sync.Mutex
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
				}
				if !currentStatus && previousStatus {
					log.Printf("Resource '%s' is down, sending notification.", t.Name)
					notifyDown(t.Name)
				} else if currentStatus && !previousStatus {
					log.Printf("Resource '%s' is back up, sending notification.", t.Name)
					notifyUp(t.Name)
				}

				resourceStatus[t.Name] = currentStatus
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
