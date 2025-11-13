import { useCallback, useState } from 'react';

import type { PendingDeletion } from '../types/appState';

type UseDeletionBannerOptions = {
  resolveNodeLabel: (nodeId: string) => string;
  resolveGroupLabel: (groupId: string) => string;
  removeNodeById: (nodeId: string) => void;
  removeGroupById: (groupId: string) => void;
  notify?: (message: string) => void;
};

export const useDeletionBanner = ({
  resolveNodeLabel,
  resolveGroupLabel,
  removeNodeById,
  removeGroupById,
  notify,
}: UseDeletionBannerOptions) => {
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  const requestNodeRemoval = useCallback(
    (nodeId: string) => {
      setPendingDeletion({
        kind: 'node',
        id: nodeId,
        label: resolveNodeLabel(nodeId),
      });
    },
    [resolveNodeLabel]
  );

  const requestGroupRemoval = useCallback(
    (groupId: string) => {
      setPendingDeletion({
        kind: 'group',
        id: groupId,
        label: resolveGroupLabel(groupId),
      });
    },
    [resolveGroupLabel]
  );

  const confirmPendingDeletion = useCallback(() => {
    setPendingDeletion((current) => {
      if (!current) {
        return current;
      }
      if (current.kind === 'node') {
        removeNodeById(current.id);
        notify?.(`${current.label} deleted.`);
      } else {
        removeGroupById(current.id);
        notify?.(`${current.label} deleted.`);
      }
      return null;
    });
  }, [notify, removeGroupById, removeNodeById]);

  const cancelPendingDeletion = useCallback(() => {
    setPendingDeletion(null);
  }, []);

  return {
    pendingDeletion,
    requestNodeRemoval,
    requestGroupRemoval,
    confirmPendingDeletion,
    cancelPendingDeletion,
  };
};
