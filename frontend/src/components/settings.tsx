import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Settings as SettingsType } from '@/types';

interface SettingsProps {
  settings: SettingsType;
  onSave: (settings: SettingsType) => Promise<void>;
  onCancel: () => void;
  onTestTelegram: () => Promise<void>;
}

export function Settings({
  settings,
  onSave,
  onCancel,
  onTestTelegram,
}: SettingsProps) {
  const [tempSettings, setTempSettings] = useState(settings);
  const [timeframeInput, setTimeframeInput] = useState(
    settings.timeframeHours.toString()
  );

  useEffect(() => {
    setTempSettings(settings);
    setTimeframeInput(settings.timeframeHours.toString());
  }, [settings]);

  const handleSave = async () => {
    console.log('About to save:', tempSettings);
    await onSave(tempSettings);
  };

  return (
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
            <label className="block text-sm font-medium text-secondary-foreground mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-foreground mb-2">
              Timeframe (hours)
            </label>
            <input
              type="number"
              value={timeframeInput}
              onChange={(e) => setTimeframeInput(e.target.value)}
              onBlur={() => {
                const value = parseInt(timeframeInput) || 24;
                setTimeframeInput(value.toString());
                setTempSettings((prev) => ({
                  ...prev,
                  timeframeHours: value,
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={onTestTelegram}
            className="w-full sm:w-auto"
          >
            Test Telegram
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
