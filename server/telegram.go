package server

import (
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
	if err := sendTelegram("Resource down: " + resource); err == nil {
		lastSent[resource] = now
	}
}

func testTelegram() {
	_ = sendTelegram("Test notification from Uptime Monitor")
}
