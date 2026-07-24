import { useCallback, useEffect, useState } from 'react';
import type { DeepPartialSettings, Settings } from '@/types';
import { sendMessage } from '@/services/messaging';
import { repository } from '@/storage/repository';

interface UseSettings {
  settings: Settings | null;
  loading: boolean;
  /** Persists a partial (optionally per-platform) update via the background. */
  update: (patch: DeepPartialSettings) => Promise<void>;
}

/**
 * Loads settings and keeps them live by subscribing to storage changes.
 * Writes go through the background so validation/side-effects stay centralised.
 */
export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    sendMessage({ type: 'GET_SETTINGS' })
      .then((s) => {
        if (mounted) {
          setSettings(s);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    const unsubscribe = repository.subscribe('settings', (next) => {
      if (next) setSettings(next);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const update = useCallback(async (patch: DeepPartialSettings) => {
    const next = await sendMessage({ type: 'UPDATE_SETTINGS', payload: patch });
    setSettings(next);
  }, []);

  return { settings, loading, update };
}
