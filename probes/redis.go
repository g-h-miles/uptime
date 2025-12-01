package probes

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type Redis struct {
	Addr          string
	User          string
	Pass          string
	RetryAttempts int
}

func (r Redis) Check() Result {
	retries := r.RetryAttempts
	if retries <= 0 {
		retries = 3 // Default to 3 attempts
	}

	for attempt := 1; attempt <= retries; attempt++ {
		result := r.checkOnce(attempt, retries)
		if result.Status {
			return result
		}
		if attempt < retries {
			time.Sleep(2 * time.Second) // Wait 2s between retries
		}
	}

	// All retries exhausted
	return r.checkOnce(retries, retries)
}

func (r Redis) checkOnce(attempt, totalAttempts int) Result {
	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c := redis.NewClient(&redis.Options{
		Addr:     r.Addr,
		Username: r.User,
		Password: r.Pass,
	})
	defer c.Close()

	err := c.Ping(ctx).Err()
	duration := time.Since(start)
	if err != nil {
		log.Printf("[Redis] %s - Attempt %d/%d: Ping failed: %v (took %v)", r.Addr, attempt, totalAttempts, err, duration)
		return Result{Target: r.Addr, Type: "redis", Status: false, Duration: duration, CheckedAt: time.Now(), Message: err.Error()}
	}

	log.Printf("[Redis] %s - SUCCESS (took %v)", r.Addr, duration)
	return Result{Target: r.Addr, Type: "redis", Status: true, Duration: duration, CheckedAt: time.Now()}
}
