package probes

import (
	"context"
	"github.com/redis/go-redis/v9"
	"time"
)

type Redis struct {
	Addr string
}

func (r Redis) Check() Result {
	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c := redis.NewClient(&redis.Options{Addr: r.Addr})
	err := c.Ping(ctx).Err()
	duration := time.Since(start)
	if err != nil {
		return Result{Target: r.Addr, Type: "redis", Status: false, Duration: duration, CheckedAt: time.Now(), Message: err.Error()}
	}
	return Result{Target: r.Addr, Type: "redis", Status: true, Duration: duration, CheckedAt: time.Now()}
}
