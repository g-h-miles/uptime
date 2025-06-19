import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { formatDuration, getMedianResponseTime } from '@/lib/utils';
import { CheckResult } from '@/types';

interface ServiceChartProps {
  service: FullService;
  checks: CheckResult[];
  timeframeHours: number;
}

type FullService = {
  checks: CheckResult[];
  latestCheck: CheckResult;
  uptime: number;
  medianResponseTime: number;
  status: string;
  id: number;
  name: string;
  url: string;
  type: 'http' | 'postgres' | 'redis';
  username?: string;
  password?: string;
};

export function ServiceChart({
  service,
  checks,
  timeframeHours,
}: ServiceChartProps) {
  const medianResponseTime = getMedianResponseTime(
    checks.map((check) => check.duration)
  );

  const chartData = checks
    .slice()
    .reverse()
    .map((check) => ({
      time: format(
        new Date(check.checkedAt),
        timeframeHours > 24 ? 'MM-dd HH:mm' : 'HH:mm'
      ),
      upTime: check.status ? check.duration : null,
      downTime: check.status ? null : 0,
      status: check.status,
      checkedAt: check.checkedAt,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-muted text-muted-foreground text-xs rounded px-3 py-2 shadow-lg">
          <p className="font-medium">Time: {label}</p>
          {data.status ? (
            <>
              <p>Status: Up</p>
              <p>Response time: {formatDuration(data.upTime)}</p>
            </>
          ) : (
            <p>Status: Down</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Response Time</p>
          <p className="font-semibold">
            {service.status === 'up'
              ? formatDuration(medianResponseTime)
              : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Uptime</p>
          <p className="font-semibold">{service.uptime.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Last Check</p>
          <p className="font-semibold">
            {service.latestCheck
              ? format(new Date(service.latestCheck.checkedAt), 'HH:mm:ss')
              : 'Never'}
          </p>
        </div>
      </div> */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{timeframeHours}h ago</span>
        <span className="font-medium">{service.uptime.toFixed(2)}% Uptime</span>
        <span className="font-medium">
          {service.status === 'up' ? formatDuration(medianResponseTime) : 'N/A'}
          {' response time'}
        </span>
        <span>Now</span>
      </div>
      <div className="h-32 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" fontSize={10} />
            <YAxis
              fontSize={10}
              tickFormatter={(value) => `${value}ms`}
              domain={[0, 'dataMax + 10']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="upTime"
              stroke="#b19cd9"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="downTime"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
