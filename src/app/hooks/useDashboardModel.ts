import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { generateDashboardSummary } from '../../lib/dashboardData';
import type { CanvasGroup, GroupLink, NetworkLink, NetworkNode } from '../../types/graph';
import type { DashboardEntity } from '../../components/DashboardPage';
import type { TabId } from '../../constants/tabs';
import type { ConnectionDraft } from '../../types/appState';
import type { DashboardViewModel } from '../DashboardView';

type UseDashboardModelArgs = {
  activeTab: TabId;
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
  profileContext: {
    nodes: NetworkNode[];
    groups: CanvasGroup[];
    links: NetworkLink[];
    groupLinks: GroupLink[];
  };
  setActiveTab: (tab: TabId) => void;
  setActiveNodeId: Dispatch<SetStateAction<string | null>>;
  setHoveredNodeId: Dispatch<SetStateAction<string | null>>;
  setHoveredEdgeKey: Dispatch<SetStateAction<string | null>>;
  setHoveredGroupLinkKey: Dispatch<SetStateAction<string | null>>;
  setSelectedGroupId: Dispatch<SetStateAction<string | null>>;
  setHoveredGroupId: Dispatch<SetStateAction<string | null>>;
  setConnectionDraft: Dispatch<SetStateAction<ConnectionDraft | null>>;
  setConnectionBuilderMode: Dispatch<SetStateAction<boolean>>;
  openProfileWindow: (kind: 'node' | 'group', resourceId: string) => void;
  handleContextMenuDismiss: () => void;
};

export const useDashboardModel = ({
  activeTab,
  nodes,
  groups,
  links,
  groupLinks,
  profileContext,
  setActiveTab,
  setActiveNodeId,
  setHoveredNodeId,
  setHoveredEdgeKey,
  setHoveredGroupLinkKey,
  setSelectedGroupId,
  setHoveredGroupId,
  setConnectionDraft,
  setConnectionBuilderMode,
  openProfileWindow,
  handleContextMenuDismiss,
}: UseDashboardModelArgs): DashboardViewModel => {
  const summary = useMemo(() => {
    if (activeTab !== 'dashboard') {
      return null;
    }
    return generateDashboardSummary({ nodes, links, groups, groupLinks });
  }, [activeTab, nodes, links, groups, groupLinks]);

  const handleFocusOnCanvas = useCallback(
    (entity: DashboardEntity) => {
      setActiveTab('canvas');
      handleContextMenuDismiss();
      setConnectionDraft(null);
      setConnectionBuilderMode(false);
      setHoveredEdgeKey(null);
      setHoveredGroupLinkKey(null);

      if (entity.kind === 'node') {
        if (!nodes.some((node) => node.id === entity.id)) {
          return;
        }
        setSelectedGroupId(null);
        setHoveredGroupId(null);
        setActiveNodeId(entity.id);
        setHoveredNodeId(entity.id);
        openProfileWindow('node', entity.id);
        return;
      }

      if (!groups.some((group) => group.id === entity.id)) {
        return;
      }
      setActiveNodeId(null);
      setHoveredNodeId(null);
      setSelectedGroupId(entity.id);
      setHoveredGroupId(entity.id);
      openProfileWindow('group', entity.id);
    },
    [
      groups,
      handleContextMenuDismiss,
      nodes,
      openProfileWindow,
      setActiveNodeId,
      setActiveTab,
      setConnectionBuilderMode,
      setConnectionDraft,
      setHoveredEdgeKey,
      setHoveredGroupId,
      setHoveredGroupLinkKey,
      setHoveredNodeId,
      setSelectedGroupId,
    ]
  );

  return useMemo(
    () => ({
      summary,
      nodes,
      groups,
      links,
      groupLinks,
      onFocusOnCanvas: handleFocusOnCanvas,
      profileContext,
    }),
    [summary, nodes, groups, links, groupLinks, handleFocusOnCanvas, profileContext]
  );
};
