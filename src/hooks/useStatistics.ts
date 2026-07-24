import { useCallback, useEffect, useState } from 'react';
import type { Platform, Statistics } from '@/types';
import { onBroadcast, sendMessage } from '@/services/messaging';
import { repository } from '@/storage/repository';

interface UseStatistics {
  stats: Statistics | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Loads derived statistics for one platform and refreshes on data changes. */
export function useStatistics(platform: Platform): UseStatistics {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await sendMessage({ type: 'GET_STATISTICS', platform });
    setStats(s);
    setLoading(false);
  }, [platform]);

  useEffect(() => {
    void refresh();
    const unsubBroadcast = onBroadcast((m) => {
      if (m.type === 'STATUS_CHANGED' || m.type === 'DAY_RESET') void refresh();
    });
    const unsubStore = repository.subscribe('dailyState', () => void refresh());
    return () => {
      unsubBroadcast();
      unsubStore();
    };
  }, [platform, refresh]);

  return { stats, loading, refresh };
}
