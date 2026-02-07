import { useState, useCallback } from 'react';

export function useForceUpdate() {
  const [, setTick] = useState(0);

  const forceRefresh = useCallback(() => {
    setTick(tick => tick + 1);
  }, []);

  return forceRefresh;
}
