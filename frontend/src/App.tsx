import { useState, useMemo, useEffect } from 'react';
import {
  Globe,
  Database,
  Server,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Edit2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useChecks, useSettings, useTargets } from '@/hooks/useApi';
import { TargetInfo } from '@/types';
import { formatDuration, getStatusBgColor, cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddOrEditServiceDialog } from '@/AddOrEditServiceDialog';

function App() {
  const {
    targets,
    loading: targetsLoading,
    error: targetsError,
    refetch,
    addTarget,
    updateTarget,
    deleteTarget,
  } = useTargets();
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();
  const {
    checks,
    loading: checksLoading,
    error: checksError,
  } = useChecks(settings.timeframeHours, settings.frequency);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  const [editingTarget, setEditingTarget] = useState<TargetInfo | null>(null);

  const loading = targetsLoading || checksLoading;
  const error = targetsError || checksError;

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const services = useMemo(() => {
    return targets.map((target) => {
      const targetChecks = checks.filter(
        (c) => c.target === target.url || c.target === target.name
      );
      const sortedChecks = targetChecks.sort(
        (a, b) =>
          new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
      );
      const latestCheck = sortedChecks[0];
      const upChecks = targetChecks.filter((c) => c.status).length;
      const uptime =
        targetChecks.length > 0 ? (upChecks / targetChecks.length) * 100 : 0;
      const avgResponseTime =
        targetChecks.length > 0
          ? targetChecks.reduce((sum, c) => sum + c.duration, 0) /
            targetChecks.length
          : 0;

      return {
        ...target,
        checks: sortedChecks,
        latestCheck,
        uptime,
        avgResponseTime,
        status: latestCheck?.status ? 'up' : 'down',
      };
    });
  }, [targets, checks]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'http':
        return <Globe className="h-4 w-4" />;
      case 'postgres':
        return <Database className="h-4 w-4" />;
      case 'redis':
        return <Server className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="h-4 w-4" />;
      case 'down':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const overallUptime =
    services.length > 0
      ? (
          services.reduce((sum, s) => sum + s.uptime, 0) / services.length
        ).toFixed(2)
      : '0';

  const servicesUp = services.filter((s) => s.status === 'up').length;
  const servicesDown = services.filter((s) => s.status === 'down').length;

  const handleSaveSettings = async () => {
    await updateSettings(tempSettings);
    setShowSettings(false);
  };

  const handleDeleteService = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      await deleteTarget(id);
    }
  };

  const handleEdit = (target: TargetInfo) => {
    setEditingTarget(target);
  };

  const handleAddNew = () => {
    setEditingTarget({ id: 0, name: '', url: '', type: 'http' });
  };

  const handleCloseDialog = () => {
    setEditingTarget(null);
  };

  const handleSave = async (target: TargetInfo) => {
    if (target.id) {
      await updateTarget(target);
    } else {
      await addTarget(target);
    }
    handleCloseDialog();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading uptime data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Data
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Uptime Monitor</h1>
            <p className="text-gray-600 mt-1">
              Monitor your websites, databases, and services
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTempSettings(settings);
                setShowSettings(!showSettings);
              }}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Configure monitoring frequency and timeframe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency (seconds)
                  </label>
                  <input
                    type="number"
                    value={tempSettings.frequency}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        frequency: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeframe (hours)
                  </label>
                  <input
                    type="number"
                    value={tempSettings.timeframeHours}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        timeframeHours: parseInt(e.target.value) || 24,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveSettings}>Save Settings</Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overall Uptime
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallUptime}%</div>
              <p className="text-xs text-muted-foreground">
                Last {settings.timeframeHours} hours
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services Up</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {servicesUp}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently operational
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Services Down
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {servicesDown}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(service.type)}
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusBgColor(service.status)}>
                      {getStatusIcon(service.status)}
                      <span className="ml-1 capitalize">{service.status}</span>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEdit(service)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="font-mono text-sm">
                  {service.url}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Response Time</p>
                    <p className="font-semibold">
                      {service.status === 'up'
                        ? formatDuration(service.avgResponseTime)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uptime</p>
                    <p className="font-semibold">
                      {service.uptime.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Check</p>
                    <p className="font-semibold">
                      {service.latestCheck
                        ? format(
                            new Date(service.latestCheck.checkedAt),
                            'HH:mm:ss'
                          )
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {service.checks.length > 0 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={service.checks
                          .slice(-20)
                          .reverse()
                          .map((check) => ({
                            time: format(new Date(check.checkedAt), 'HH:mm'),
                            responseTime: check.status ? check.duration : null,
                          }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" fontSize={10} />
                        <YAxis
                          fontSize={10}
                          tickFormatter={(value) => `${value}ms`}
                          domain={[0, 'dataMax + 10']}
                        />
                        <Tooltip
                          labelFormatter={(value) => `Time: ${value}`}
                          formatter={(value: number) => {
                            if (value === null) return ['Down', 'Status'];
                            return [formatDuration(value), 'Response Time'];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="responseTime"
                          stroke={
                            service.status === 'down' ? '#ef4444' : '#8884d8'
                          }
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No services monitored
              </h3>
              <p className="text-gray-600 mb-4">
                The monitoring system will automatically detect and display
                services as they are checked.
              </p>
              <p className="text-sm text-gray-500">
                Current targets: Google, GitHub, PostgreSQL, Redis
              </p>
            </CardContent>
          </Card>
        )}

        <AddOrEditServiceDialog
          isOpen={!!editingTarget}
          onClose={handleCloseDialog}
          onSave={handleSave}
          existingTarget={editingTarget}
        />
      </div>
    </div>
  );
}

export default App;
