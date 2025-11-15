import { useCallback, useEffect, useState } from 'react';

import { useDeletionBanner } from '../../hooks/useDeletionBanner';

export type UtilityToastState = { id: number; message: string };

type UseNotificationBannerArgs = {
  resolveNodeLabel: (nodeId: string) => string;
  resolveGroupLabel: (groupId: string) => string;
  removeNodeById: (nodeId: string) => void;
  removeGroupById: (groupId: string) => void;
};

export const useNotificationBanner = ({
  resolveNodeLabel,
  resolveGroupLabel,
  removeNodeById,
  removeGroupById,
}: UseNotificationBannerArgs) => {
  const [utilityToast, setUtilityToast] = useState<UtilityToastState | null>(null);

  const showUtilityToast = useCallback((message: string) => {
    setUtilityToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!utilityToast) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setUtilityToast(null);
    }, 2600);
    return () => window.clearTimeout(timeoutId);
  }, [utilityToast]);

  const banner = useDeletionBanner({
    resolveNodeLabel,
    resolveGroupLabel,
    removeNodeById,
    removeGroupById,
    notify: showUtilityToast,
  });

  return {
    ...banner,
    utilityToast,
    showUtilityToast,
  };
};

export type NotificationBannerApi = ReturnType<typeof useNotificationBanner>;
