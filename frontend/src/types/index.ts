export interface CheckResult {
  target: string;
  type: string;
  status: boolean;
  duration: number; // in milliseconds
  checkedAt: string;
  message: string;
}

export interface Settings {
  frequency: number; // in seconds
  timeframeHours: number;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  type: "http" | "postgres" | "redis";
  status: "up" | "down" | "degraded";
  responseTime: number;
  uptime: number;
  lastChecked: Date;
  isMonitoring: boolean;
  history: Array<{
    timestamp: Date;
    responseTime: number;
    status: "up" | "down" | "degraded";
  }>;
}

export interface TargetInfo {
  id: number;
  name: string;
  url: string;
  type: "http" | "postgres" | "redis";
  username?: string;
  password?: string;
  subscribed?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
