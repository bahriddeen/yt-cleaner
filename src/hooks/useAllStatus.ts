import { useCallback, useEffect, useState } from 'react';
import type { LiveStatus, Platform } from '@/types';
import { onBroadcast, sendMessage } from '@/services/messaging';

type StatusMap = Record<Platform, LiveStatus>;

interface UseAllStatus {
  statuses: StatusMap | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Live status for every platform at once — used by the popup's platform
 * switcher. Updates in place from platform-scoped broadcasts.
 */
export function useAllStatus(): UseAllStatus {
  const [statuses, setStatuses] = useState<StatusMap | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await sendMessage({ type: 'GET_ALL_STATUS' });
    setStatuses(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = onBroadcast((message) => {
      if (
        message.type === 'STATUS_CHANGED' ||
        message.type === 'LIMIT_REACHED' ||
        message.type === 'DAY_RESET'
      ) {
        const s = message.payload;
        setStatuses((prev) => (prev ? { ...prev, [s.platform]: s } : prev));
      } else if (message.type === 'OVERRIDE_ENDED') {
        void refresh();
      }
    });
    return unsubscribe;
  }, [refresh]);

  return { statuses, loading, refresh };
}
