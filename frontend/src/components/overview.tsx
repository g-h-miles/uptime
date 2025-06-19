import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OverviewProps {
  overallUptime: string;
  servicesUp: number;
  servicesDown: number;
  timeframeHours: number;
}

export function Overview({
  overallUptime,
  servicesUp,
  servicesDown,
  timeframeHours,
}: OverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallUptime}%</div>
          <p className="text-xs text-muted-foreground">
            Last {timeframeHours} hours
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Services Up</CardTitle>
          <CheckCircle className="h-4 w-4 text-[#6fc276]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#6fc276]">{servicesUp}</div>
          <p className="text-xs text-muted-foreground">Currently operational</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Services Down</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{servicesDown}</div>
          <p className="text-xs text-muted-foreground">Need attention</p>
        </CardContent>
      </Card>
    </div>
  );
}
