import { useMemo } from 'react';

import { useProfileWindows } from '../../hooks/useProfileWindows';
import type { CanvasGroup, GroupLink, NetworkLink, NetworkNode } from '../../types/graph';
import type { ProfileWindowState } from '../../types/appState';

type ProfileContext = {
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
};

type UseProfileWindowsControllerArgs = {
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
  onProfileFieldChange: (kind: ProfileWindowState['kind'], resourceId: string, fieldKey: string, value: string) => void;
};

export const useProfileWindowsController = ({
  nodes,
  groups,
  links,
  groupLinks,
  onProfileFieldChange,
}: UseProfileWindowsControllerArgs) => {
  const profileContext = useMemo<ProfileContext>(
    () => ({ nodes, groups, links, groupLinks }),
    [nodes, groups, links, groupLinks]
  );

  const {
    profileWindows,
    profileWindowCount,
    openProfileWindow,
    focusProfileWindow,
    moveProfileWindow,
    closeProfileWindowById,
    closeProfileWindowsByResource,
    closeTopProfileWindow,
  } = useProfileWindows();

  return {
    profileWindows,
    profileWindowCount,
    profileContext,
    openProfileWindow,
    focusProfileWindow,
    moveProfileWindow,
    closeProfileWindowById,
    closeProfileWindowsByResource,
    closeTopProfileWindow,
    onProfileFieldChange,
  };
};

export type ProfileWindowsController = ReturnType<typeof useProfileWindowsController>;
