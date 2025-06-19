import { useMemo } from 'react';
import { CheckResult } from '@/types';
import { format, subHours, addHours } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getMedianResponseTime } from '@/lib/utils';

interface UptimeChartProps {
  checks: CheckResult[];
  timeframeHours: number;
  height?: string;
}

export function UptimeChart({
  checks,
  timeframeHours,
  height = 'h-20',
}: UptimeChartProps) {
  const slotDurationHours = timeframeHours / 24;

  const chartData = useMemo(() => {
    const now = new Date();

    const buckets = [];

    for (let i = 0; i < 24; i++) {
      const startTime = subHours(now, timeframeHours - i * slotDurationHours);
      const endTime = addHours(startTime, slotDurationHours);

      const bucketChecks = checks.filter((check) => {
        const checkTime = new Date(check.checkedAt);
        return checkTime >= startTime && checkTime < endTime;
      });

      const upChecks = bucketChecks.filter((check) => check.status).length;
      const totalChecks = bucketChecks.length;

      const medianResponseTime = getMedianResponseTime(
        bucketChecks.map((check) => check.duration)
      );

      let uptime = 0;
      let status = 'no-data';

      if (totalChecks > 0) {
        uptime = (upChecks / totalChecks) * 100;
        if (uptime === 100) status = 'up';
        else if (uptime === 0) status = 'down';
        else status = 'partial';
      } else {
        // Set to 100% height for no-data bars
        uptime = 100;
      }

      buckets.push({
        slot: i,
        uptime,
        status,
        startTime,
        endTime,
        upChecks,
        totalChecks,
        timeLabel: format(
          startTime,
          slotDurationHours >= 24 ? 'MMM dd' : 'HH:mm'
        ),
        medianResponseTime,
      });
    }

    return buckets;
  }, [checks, timeframeHours, slotDurationHours]);

  const overallUptime = useMemo(() => {
    const totalChecks = chartData.reduce(
      (sum, bucket) => sum + bucket.totalChecks,
      0
    );
    const totalUpChecks = chartData.reduce(
      (sum, bucket) => sum + bucket.upChecks,
      0
    );

    return totalChecks > 0
      ? ((totalUpChecks / totalChecks) * 100).toFixed(2)
      : '0.00';
  }, [chartData]);

  const overallMedianResponseTime = useMemo(() => {
    const totalChecks = chartData.reduce(
      (sum, bucket) => sum + bucket.totalChecks,
      0
    );
    return totalChecks > 0
      ? getMedianResponseTime(checks.map((check) => check.duration))
      : 0;
  }, [checks]);

  const getBarColor = (status: string) => {
    switch (status) {
      case 'up':
        return '#6fc276'; // green-500
      case 'down':
        return '#ef4444'; // red-500
      case 'partial':
        return '#f59e0b'; // yellow-500
      case 'no-data':
        return '#9ca3af'; // gray-400
      default:
        return '#9ca3af';
    }
  };

  const getSlotDurationLabel = () => {
    if (slotDurationHours >= 24) {
      const days = Math.floor(slotDurationHours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (slotDurationHours >= 1) {
      return `${slotDurationHours}h`;
    } else {
      const minutes = Math.round(slotDurationHours * 60);
      return `${minutes}m`;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const formatStr = slotDurationHours >= 24 ? 'MMM dd' : 'MMM dd, HH:mm';

      return (
        <div className="bg-muted text-muted-foreground text-xs rounded px-3 py-2 shadow-lg">
          <p className="font-medium">
            {format(data.startTime, formatStr)} -{' '}
            {format(data.endTime, formatStr)}
          </p>
          {data.totalChecks > 0 ? (
            <>
              <p>
                Uptime: {((data.upChecks / data.totalChecks) * 100).toFixed(1)}%
              </p>
              <p>
                Checks: {data.upChecks}/{data.totalChecks}
              </p>
            </>
          ) : (
            <p>No data available</p>
          )}
          <p>Response time: {data.medianResponseTime}ms</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{timeframeHours}h ago</span>
        <span className="font-medium">{overallUptime}% Uptime</span>
        <span className="font-medium">
          {overallMedianResponseTime}ms response time
        </span>
        <span>Now</span>
      </div>

      <div className={height}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis hide />
            <YAxis hide domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="uptime" radius={[1, 1, 1, 1]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {format(
            subHours(new Date(), timeframeHours),
            slotDurationHours >= 24 ? 'MMM dd' : 'HH:mm'
          )}
        </span>
        <span className="text-center">Each bar: {getSlotDurationLabel()}</span>
        <span>
          {format(new Date(), slotDurationHours >= 24 ? 'MMM dd' : 'HH:mm')}
        </span>
      </div>
    </div>
  );
}
