import { useCallback, useEffect, useState } from 'react';
import type { LiveStatus, Platform } from '@/types';
import { onBroadcast, sendMessage } from '@/services/messaging';

interface UseStatus {
  status: LiveStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Live daily status for one platform. Fetches once, then updates from
 * background broadcasts scoped to that platform — no polling.
 */
export function useStatus(platform: Platform): UseStatus {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await sendMessage({ type: 'GET_STATUS', platform });
    setStatus(s);
    setLoading(false);
  }, [platform]);

  useEffect(() => {
    void refresh();
    const unsubscribe = onBroadcast((message) => {
      if (
        message.type === 'STATUS_CHANGED' ||
        message.type === 'LIMIT_REACHED' ||
        message.type === 'DAY_RESET'
      ) {
        if (message.payload.platform === platform) setStatus(message.payload);
      } else if (message.type === 'OVERRIDE_ENDED' && message.platform === platform) {
        void refresh();
      }
    });
    return unsubscribe;
  }, [platform, refresh]);

  return { status, loading, refresh };
}
