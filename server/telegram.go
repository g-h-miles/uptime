package server

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

var lastSent = make(map[string]time.Time)

func sendTelegram(msg string) error {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	chatID := os.Getenv("TELEGRAM_CHAT_ID")
	if token == "" || chatID == "" {
		return nil
	}
	data := url.Values{}
	data.Set("chat_id", chatID)
	data.Set("text", msg)
	_, err := http.PostForm("https://api.telegram.org/bot"+token+"/sendMessage", data)
	return err
}

func notifyDown(resource string) {
	now := time.Now()
	if t, ok := lastSent[resource]; ok {
		if now.Sub(t) < 24*time.Hour && now.Day() == t.Day() {
			return
		}
	}
	if err := sendTelegram("🚨 Resource down: " + resource); err == nil {
		lastSent[resource] = now
	}
}

func notifyUp(resource string) {
	if err := sendTelegram("✅ Resource back up: " + resource); err == nil {
		// Clear the 'lastSent' timestamp for this resource.
		// This is important so that if it goes down again, a new
		// 'down' notification can be sent immediately.
		delete(lastSent, resource)
	}
}

func testTelegram() {
	_ = sendTelegram("Test notification from Uptime Monitor")
}

func callWebhook(webhookURL string) {
	if webhookURL == "" {
		return
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(webhookURL)
	if err != nil {
		log.Printf("Webhook call failed for %s: %v", webhookURL, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("Webhook called successfully: %s (status: %d)", webhookURL, resp.StatusCode)
	} else {
		log.Printf("Webhook returned non-success status: %s (status: %d)", webhookURL, resp.StatusCode)
	}
}
