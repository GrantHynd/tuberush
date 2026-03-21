import { useCallback } from 'react';
import { capture, identify, resetIdentity } from '@/lib/posthog';

/**
 * Hook for capturing PostHog analytics events.
 *
 * Usage:
 *   const { track, identifyUser, resetUser } = useAnalytics();
 *   track('game_started', { gameType: 'crossword' });
 */
export function useAnalytics() {
  const track = useCallback(
    (event: string, properties?: Record<string, any>) => {
      capture(event, properties);
    },
    [],
  );

  const identifyUser = useCallback(
    (userId: string, properties?: Record<string, any>) => {
      identify(userId, properties);
    },
    [],
  );

  const resetUser = useCallback(() => {
    resetIdentity();
  }, []);

  return { track, identifyUser, resetUser };
}
