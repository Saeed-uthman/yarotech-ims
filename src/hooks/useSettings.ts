import { useState, useEffect, useCallback, useRef } from 'react';
import { SystemSettings, UpdateSettingsInput, ChangePasswordInput, UserRole } from '../types';
import { settingsService } from '../services/settingsService';
import { DEFAULT_SYSTEM_SETTINGS } from '../data/defaultSettings';

export function useSettings(role: UserRole = 'admin', enabled = true) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await settingsService.getSettings(forceRefresh);
      if (isMountedRef.current) {
        if (response.success && response.data) {
          setSettings(response.data);
        } else {
          setError(response.message || 'Failed to load system settings.');
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load system settings.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (input: UpdateSettingsInput): Promise<{ success: boolean; message?: string }> => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await settingsService.updateSettings(input, role);
        if (isMountedRef.current) {
          if (response.success && response.data) {
            setSettings(response.data);
            return { success: true, message: response.message };
          } else {
            const msg = response.message || 'Failed to update system settings.';
            setError(msg);
            return { success: false, message: msg };
          }
        }
        return { success: response.success, message: response.message };
      } catch (err: any) {
        const msg = err.message || 'Failed to update system settings.';
        if (isMountedRef.current) {
          setError(msg);
        }
        return { success: false, message: msg };
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
        }
      }
    },
    [role]
  );

  const resetSettings = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    setIsResetting(true);
    setError(null);
    try {
      const response = await settingsService.resetSettings(role);
      if (isMountedRef.current) {
        if (response.success && response.data) {
          setSettings(response.data);
          return { success: true, message: response.message };
        } else {
          const msg = response.message || 'Failed to reset settings.';
          setError(msg);
          return { success: false, message: msg };
        }
      }
      return { success: response.success, message: response.message };
    } catch (err: any) {
      const msg = err.message || 'Failed to reset settings.';
      if (isMountedRef.current) {
        setError(msg);
      }
      return { success: false, message: msg };
    } finally {
      if (isMountedRef.current) {
        setIsResetting(false);
      }
    }
  }, [role]);

  const changePassword = useCallback(
    async (input: ChangePasswordInput): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await settingsService.changePassword(input, role);
        return { success: response.success, message: response.message };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to change password.' };
      }
    },
    [role]
  );

  return {
    settings,
    isLoading,
    isSaving,
    isResetting,
    error,
    refetch: fetchSettings,
    updateSettings,
    resetSettings,
    changePassword,
  };
}
