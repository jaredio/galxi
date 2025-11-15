import { useCallback, useState } from 'react';

/**
 * Tracks a monotonically increasing layout version so consumers (autosave, analytics, tests)
 * can react when node/group geometry changes without mutating React state.
 */
export const useLayoutVersion = () => {
  const [layoutVersion, setLayoutVersion] = useState(0);

  const publishLayoutChange = useCallback(() => {
    setLayoutVersion((previous) => previous + 1);
  }, []);

  return {
    layoutVersion,
    publishLayoutChange,
  };
};
