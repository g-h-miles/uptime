import { useState, useEffect, useCallback } from 'react';
import { TargetInfo, CheckResult, Settings } from '@/types';

export function useChecks(timeframeHours: number, frequency: number) {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecks = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      const response = await fetch('/api/checks');
      if (!response.ok) {
        throw new Error('Failed to fetch checks');
      }
      const data = await response.json();
      setChecks(data || []);
      if (!isBackground) setError(null);
    } catch (err) {
      if (!isBackground)
        setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchChecks(false);

    const refreshInterval = Math.max(frequency * 1000, 1000);
    const interval = setInterval(() => fetchChecks(true), refreshInterval);

    return () => clearInterval(interval);
  }, [timeframeHours, frequency, fetchChecks]);

  return {
    checks,
    setChecks,
    loading,
    error,
    refetch: () => fetchChecks(false),
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    frequency: 60,
    timeframeHours: 24,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      setSettings(newSettings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, error, updateSettings, refetch: fetchSettings };
}

export function useTargets(
  checks: CheckResult[],
  setChecks: React.Dispatch<React.SetStateAction<CheckResult[]>>
) {
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/targets');
      if (!response.ok) {
        throw new Error('Failed to fetch targets');
      }
      const data = await response.json();
      setTargets(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const addTarget = async (target: Omit<TargetInfo, 'id'>) => {
    try {
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });
      if (!response.ok) {
        throw new Error('Failed to add target');
      }
      await fetchTargets(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const updateTarget = async (target: TargetInfo) => {
    try {
      const response = await fetch(`/api/targets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });
      if (!response.ok) {
        throw new Error('Failed to update target');
      }
      await fetchTargets(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteTarget = async (id: number) => {
    try {
      const response = await fetch(`/api/targets?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete target');
      }
      await fetchTargets(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const clearChecks = async (targetUrl: string) => {
    try {
      await fetch(
        `/api/targets/clear?target=${encodeURIComponent(targetUrl)}`,
        {
          method: 'POST',
        }
      );
      const targetInfo = targets.find((t) => t.url === targetUrl);
      setChecks(
        checks.filter(
          (c) => c.target !== targetUrl && c.target !== targetInfo?.name
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const reorderTargets = (targetId: number, direction: 'up' | 'down') => {
    const index = targets.findIndex((t) => t.id === targetId);
    if (index === -1) return;

    const newTargets = [...targets];
    const [target] = newTargets.splice(index, 1);

    if (direction === 'up') {
      newTargets.splice(Math.max(0, index - 1), 0, target);
    } else {
      newTargets.splice(Math.min(newTargets.length, index + 1), 0, target);
    }
    setTargets(newTargets);
  };

  const subscribeTarget = async (id: number) => {
    try {
      await fetch(`/api/targets/subscribe?id=${id}`, { method: 'POST' });
      setTargets((prevTargets) =>
        prevTargets.map((t) => (t.id === id ? { ...t, subscribed: true } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const unsubscribeTarget = async (id: number) => {
    try {
      await fetch(`/api/targets/unsubscribe?id=${id}`, { method: 'POST' });
      setTargets((prevTargets) =>
        prevTargets.map((t) => (t.id === id ? { ...t, subscribed: false } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const testTelegram = async () => {
    await fetch('/api/test-telegram', { method: 'POST' });
  };

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return {
    targets,
    loading,
    error,
    refetch: fetchTargets,
    addTarget,
    updateTarget,
    deleteTarget,
    clearChecks,
    reorderTargets,
    subscribeTarget,
    unsubscribeTarget,
    testTelegram,
  };
}
