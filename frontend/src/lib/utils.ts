import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStatusBgColor = (status: string, isMuted = false) => {
  if (isMuted) {
    return 'bg-gray-200';
  }
  switch (status) {
    case 'up':
      return 'bg-[#6fc276] text-white';
    case 'down':
      return 'bg-red-500 text-white';
    case 'degraded':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export const formatDuration = (ms: number) => {
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

export const getMedianResponseTime = (responseTimes: number[]) => {
  let medianResponseTime = 0;
  if (responseTimes.length > 0) {
    const mid = Math.floor(responseTimes.length / 2);
    medianResponseTime =
      responseTimes.length % 2 !== 0
        ? responseTimes[mid]
        : (responseTimes[mid - 1] + responseTimes[mid]) / 2;
  }

  return medianResponseTime;
};
