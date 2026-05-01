import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '../types/settings';
import { defaultSettings } from './defaultSettings';

const STORAGE_KEY = 'violin-harmonic-analyzer-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(raw) } as AppSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev: AppSettings) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => setSettings(defaultSettings), []);

  return { settings, updateSettings, resetSettings };
}
