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
  ChartLine,
  Barcode,
  LineChart,
  Sun,
  Moon,
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
import {
  formatDuration,
  getStatusBgColor,
  cn,
  getMedianResponseTime,
} from '@/lib/utils';
import { format } from 'date-fns';
import { Settings } from '@/components/settings';
import { Settings as SettingsType } from '@/types';
import { AddOrEditServiceDialog } from '@/AddOrEditServiceDialog';
import { ServiceChart } from '@/components/chart';
import { UptimeChart } from '@/components/uptime-chart';
import { Overview } from './components/overview';
import { ServiceDropdownMenu } from './components/service-menu';
import { ModeToggle } from './components/theme-toggle';

function App() {
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();
  const {
    checks,
    setChecks,
    loading: checksLoading,
    error: checksError,
    refetch: refetchChecks,
  } = useChecks(settings.timeframeHours, settings.frequency);
  const {
    targets,
    loading: targetsLoading,
    error: targetsError,
    refetch,
    addTarget,
    updateTarget,
    deleteTarget,
    clearChecks,
    subscribeTarget,
    unsubscribeTarget,
    reorderTargets,
    testTelegram,
  } = useTargets(checks, setChecks);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  const [editingTarget, setEditingTarget] = useState<TargetInfo | null>(null);
  const [chartTypeMap, setChartTypeMap] = useState<
    Record<string, 'uptime' | 'response-time'>
  >({});

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
      const upChecks = targetChecks.filter((c) => c.status);
      const uptime =
        targetChecks.length > 0
          ? (upChecks.length / targetChecks.length) * 100
          : 0;

      const responseTimes = upChecks
        .map((c) => c.duration)
        .sort((a, b) => a - b);
      const medianResponseTime = getMedianResponseTime(responseTimes);

      return {
        ...target,
        checks: sortedChecks,
        latestCheck,
        uptime,
        medianResponseTime,
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

  const handleSaveSettings = async (newSettings: SettingsType) => {
    console.log('App received settings to save:', newSettings);
    await updateSettings(newSettings);
    setShowSettings(false);
  };
  const handleCancelSettings = () => {
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

  const getChartType = (serviceId: number) => {
    return chartTypeMap[serviceId] || 'uptime';
  };

  const toggleChartType = (serviceId: number) => {
    const currentType = getChartType(serviceId);
    setChartTypeMap((prev) => ({
      ...prev,
      [serviceId]: currentType === 'uptime' ? 'response' : 'uptime',
    }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center `}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading uptime data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center `}>
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-primary mb-2">
            Error Loading Data
          </h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 `}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={'./logo.svg'}
              alt="Uptime Monitor Logo"
              className="h-20 w-20"
            />
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Uptime Monitor
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor your websites, databases, and services
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:flex md:w-auto">
            <ModeToggle />
            <Button variant="outline" onClick={handleAddNew}>
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
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
            onCancel={handleCancelSettings}
            onTestTelegram={testTelegram}
          />
        )}

        {/* Overview Stats */}
        <Overview
          overallUptime={overallUptime}
          servicesUp={servicesUp}
          servicesDown={servicesDown}
          timeframeHours={settings.timeframeHours}
        />

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            <Card key={service.id} className="overflow-hidden flex flex-col">
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
                    <ServiceDropdownMenu
                      service={service}
                      index={index}
                      totalServices={services.length}
                      onEdit={handleEdit}
                      onMoveUp={(id) => reorderTargets(id, 'up')}
                      onMoveDown={(id) => reorderTargets(id, 'down')}
                      onClear={clearChecks}
                      onSubscribe={subscribeTarget}
                      onUnsubscribe={unsubscribeTarget}
                      onDelete={handleDeleteService}
                    />
                  </div>
                </div>
                <CardDescription className="font-mono text-sm break-all">
                  {service.type === 'http' ? (
                    <a
                      href={
                        service.url.startsWith('http')
                          ? service.url
                          : `https://${service.url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {service.url.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    service.url
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0 flex-1 flex flex-col">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {/* ... existing stats ... */}
                </div>

                {service.checks.length > 0 && (
                  <div className="space-y-0 flex-1">
                    {getChartType(service.id) === 'uptime' ? (
                      <UptimeChart
                        checks={service.checks}
                        timeframeHours={settings.timeframeHours}
                        height="h-10"
                      />
                    ) : (
                      <ServiceChart
                        service={service}
                        checks={service.checks}
                        timeframeHours={settings.timeframeHours}
                      />
                    )}
                  </div>
                )}

                {/* This div will be pushed to the bottom */}
                <div className="mt-auto pt-0 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleChartType(service.id)}
                  >
                    {getChartType(service.id) === 'uptime' ? (
                      <LineChart />
                    ) : (
                      <Barcode />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Server className="h-12 w-12 text-secondary-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary-foreground mb-2">
                No services monitored
              </h3>
              <p className="text-secondary-foreground mb-4">
                The monitoring system will automatically detect and display
                services as they are checked.
              </p>
              <p className="text-sm text-muted-foreground">
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
