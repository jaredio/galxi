import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';

import { makeGroupLinkKey } from '../lib/graph-utils';
import type {
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  NetworkLink,
  NodePositionMap,
  SimulationNode,
} from '../types/graph';
import type {
  ConnectionDraft,
  ConnectionFormState,
  ContextMenuState,
  GroupFormState,
  NodeFormState,
} from '../types/appState';

type Updater<T> = (current: T) => T;

type UseGraphOrchestrationOptions = {
  links: NetworkLink[];
  groupLinks: GroupLink[];
  setLinks: (updater: Updater<NetworkLink[]>) => void;
  setGroupLinks: (updater: Updater<GroupLink[]>) => void;
  collapsePanel: () => void;
  setConnectionForm: React.Dispatch<React.SetStateAction<ConnectionFormState | null>>;
  setNodeForm: React.Dispatch<React.SetStateAction<NodeFormState | null>>;
  setGroupForm: React.Dispatch<React.SetStateAction<GroupFormState | null>>;
  showUtilityToast: (message: string) => void;
  openProfileWindow: (kind: 'node' | 'group', resourceId: string) => void;
  nodePositionsRef: MutableRefObject<NodePositionMap>;
  groupPositionsRef: MutableRefObject<GroupPositionMap>;
  lastSyncedConnectionRef: MutableRefObject<{
    kind: 'node' | 'group';
    key: string;
    relation: string;
  } | null>;
};

export const useGraphOrchestration = ({
  links,
  groupLinks,
  setLinks,
  setGroupLinks,
  collapsePanel,
  setConnectionForm,
  setNodeForm,
  setGroupForm,
  showUtilityToast,
  openProfileWindow,
  nodePositionsRef,
  groupPositionsRef,
  lastSyncedConnectionRef,
}: UseGraphOrchestrationOptions) => {
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [connectionBuilderMode, setConnectionBuilderMode] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);
  const [hoveredGroupLinkKey, setHoveredGroupLinkKey] = useState<string | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleSidebarStartConnection = useCallback(() => {
    setConnectionDraft(null);
    setConnectionBuilderMode(true);
    showUtilityToast('Select the source node to start a connection.');
  }, [showUtilityToast]);

  const handleCanvasBackgroundClick = useCallback(() => {
    setConnectionDraft(null);
    setConnectionBuilderMode(false);
    setActiveNodeId(null);
    setHoveredNodeId(null);
    setHoveredEdgeKey(null);
    setHoveredGroupLinkKey(null);
    setContextMenu(null);
    setConnectionForm(null);
    setSelectedGroupId(null);
    setHoveredGroupId(null);
    setGroupForm(null);
  }, [setConnectionForm, setGroupForm]);

  const finalizeConnectionDraft = useCallback(
    (target: { kind: 'node'; nodeId: string } | { kind: 'group'; groupId: string }) => {
      if (!connectionDraft) {
        return false;
      }

      if (connectionDraft.kind === 'node' && target.kind === 'node') {
        const targetNodeId = target.nodeId;
        if (connectionDraft.sourceNodeId === targetNodeId) {
          setConnectionDraft(null);
          return true;
        }
        const sourceId = connectionDraft.sourceNodeId;
        const linkKey = `${sourceId}->${targetNodeId}`;
        const linkExists = links.some((link) => link.source === sourceId && link.target === targetNodeId);
        const created = !linkExists;
        if (created) {
          setLinks((prev) => [
            ...prev,
            {
              source: sourceId,
              target: targetNodeId,
              relation: '',
            },
          ]);
        }
        setConnectionDraft(null);
        setActiveNodeId(targetNodeId);
        setHoveredNodeId(targetNodeId);
        setHoveredEdgeKey(linkKey);
        setHoveredGroupLinkKey(null);
        setContextMenu(null);
        setSelectedGroupId(null);
        setHoveredGroupId(null);
        if (created) {
          collapsePanel();
          lastSyncedConnectionRef.current = {
            kind: 'node',
            key: linkKey,
            relation: '',
          };
          setConnectionForm({
            mode: 'edit',
            kind: 'node',
            linkKey,
            relation: '',
          });
        }
        return true;
      }

      if (connectionDraft.kind === 'group' && target.kind === 'group') {
        const targetGroupId = target.groupId;
        if (connectionDraft.sourceGroupId === targetGroupId) {
          setConnectionDraft(null);
          return true;
        }
        const sourceGroupId = connectionDraft.sourceGroupId;
        const linkKey = `${sourceGroupId}->${targetGroupId}`;
        const linkExists = groupLinks.some(
          (link) => link.sourceGroupId === sourceGroupId && link.targetGroupId === targetGroupId
        );
        const created = !linkExists;
        if (created) {
          setGroupLinks((prev) => [
            ...prev,
            {
              sourceGroupId,
              targetGroupId,
              relation: '',
            },
          ]);
        }
        setConnectionDraft(null);
        setSelectedGroupId(targetGroupId);
        setHoveredGroupId(targetGroupId);
        setActiveNodeId(null);
        setHoveredNodeId(null);
        setHoveredEdgeKey(null);
        setHoveredGroupLinkKey(linkKey);
        setContextMenu(null);
        if (created) {
          collapsePanel();
          lastSyncedConnectionRef.current = {
            kind: 'group',
            key: linkKey,
            relation: '',
          };
          setConnectionForm({
            mode: 'edit',
            kind: 'group',
            linkKey,
            relation: '',
          });
        }
        return true;
      }

      return false;
    },
    [
      collapsePanel,
      connectionDraft,
      groupLinks,
      lastSyncedConnectionRef,
      links,
      setConnectionForm,
      setGroupLinks,
      setLinks,
    ]
  );

  const handleNodeClick = useCallback(
    (node: SimulationNode) => {
      if (connectionBuilderMode && !connectionDraft) {
        setConnectionBuilderMode(false);
        const sourcePosition =
          nodePositionsRef.current[node.id] ?? { x: node.x ?? 0, y: node.y ?? 0 };
        setConnectionDraft({
          kind: 'node',
          sourceNodeId: node.id,
          cursor: { x: sourcePosition.x, y: sourcePosition.y },
        });
        setActiveNodeId(node.id);
        setHoveredNodeId(node.id);
        setContextMenu(null);
        setHoveredGroupLinkKey(null);
        setConnectionForm(null);
        setSelectedGroupId(null);
        setGroupForm(null);
        setHoveredGroupId(null);
        showUtilityToast('Select the target to finish the connection.');
        return;
      }
      if (finalizeConnectionDraft({ kind: 'node', nodeId: node.id })) {
        return;
      }
      setConnectionDraft(null);
      setActiveNodeId(node.id);
      setHoveredNodeId(node.id);
      setContextMenu(null);
      setHoveredGroupLinkKey(null);
      setConnectionForm(null);
      setSelectedGroupId(null);
      setGroupForm(null);
      setHoveredGroupId(null);
    },
    [
      connectionBuilderMode,
      connectionDraft,
      finalizeConnectionDraft,
      nodePositionsRef,
      setConnectionForm,
      setGroupForm,
      showUtilityToast,
    ]
  );

  const handleNodeAuxClick = useCallback(
    (_event: MouseEvent, node: SimulationNode) => {
      if (finalizeConnectionDraft({ kind: 'node', nodeId: node.id })) {
        return;
      }
      const sourcePosition =
        nodePositionsRef.current[node.id] ?? { x: node.x ?? 0, y: node.y ?? 0 };
      setConnectionDraft({
        kind: 'node',
        sourceNodeId: node.id,
        cursor: { x: sourcePosition.x, y: sourcePosition.y },
      });
      setActiveNodeId(node.id);
      setHoveredNodeId(node.id);
      setContextMenu(null);
      setHoveredGroupLinkKey(null);
      setConnectionForm(null);
      setSelectedGroupId(null);
      setGroupForm(null);
      setHoveredGroupId(null);
    },
    [finalizeConnectionDraft, nodePositionsRef, setConnectionForm, setGroupForm]
  );

  const handleNodeDoubleClick = useCallback(
    (node: SimulationNode) => {
      if (finalizeConnectionDraft({ kind: 'node', nodeId: node.id })) {
        return;
      }
      openProfileWindow('node', node.id);
    },
    [finalizeConnectionDraft, openProfileWindow]
  );

  const handleNodeContextMenu = useCallback(
    (event: MouseEvent, node: SimulationNode) => {
      event.preventDefault();
      setConnectionDraft(null);
      setActiveNodeId(node.id);
      setHoveredNodeId(node.id);
      setHoveredEdgeKey(null);
      setHoveredGroupLinkKey(null);
      setConnectionForm(null);
      setSelectedGroupId(null);
      setGroupForm(null);
      setHoveredGroupId(null);
      setContextMenu({
        kind: 'node',
        screenX: event.clientX,
        screenY: event.clientY,
        nodeId: node.id,
      });
    },
    [setConnectionForm, setGroupForm]
  );

  const handleEdgeHover = useCallback((edgeKey: string | null) => {
    setHoveredEdgeKey(edgeKey);
  }, []);

  const handleGroupHover = useCallback((groupId: string | null) => {
    setHoveredGroupId(groupId);
  }, []);

  const handleGroupLinkHover = useCallback((linkKey: string | null) => {
    setHoveredGroupLinkKey(linkKey);
  }, []);

  const handleGroupLinkContextMenu = useCallback(
    (event: MouseEvent, link: GroupLink) => {
      const linkKey = makeGroupLinkKey(link);
      setConnectionDraft(null);
      setActiveNodeId(null);
      setHoveredNodeId(null);
      setHoveredEdgeKey(null);
      setSelectedGroupId(null);
      setHoveredGroupId(null);
      setConnectionForm(null);
      setHoveredGroupLinkKey(linkKey);
      setContextMenu({
        kind: 'group-connection',
        screenX: event.clientX,
        screenY: event.clientY,
        linkKey,
      });
    },
    [setConnectionForm]
  );

  const handleGroupAuxClick = useCallback(
    (_event: MouseEvent, group: CanvasGroup) => {
      if (finalizeConnectionDraft({ kind: 'group', groupId: group.id })) {
        return;
      }
      const sourcePosition =
        groupPositionsRef.current[group.id] ?? {
          x: group.x + group.width / 2,
          y: group.y + group.height / 2,
        };
      setConnectionDraft({
        kind: 'group',
        sourceGroupId: group.id,
        cursor: { x: sourcePosition.x, y: sourcePosition.y },
      });
      setSelectedGroupId(group.id);
      setHoveredGroupId(group.id);
      setActiveNodeId(null);
      setHoveredNodeId(null);
      setHoveredEdgeKey(null);
      setHoveredGroupLinkKey(null);
      setContextMenu(null);
      setConnectionForm(null);
      setGroupForm(null);
    },
    [finalizeConnectionDraft, groupPositionsRef, setConnectionForm, setGroupForm]
  );

  const handleGroupSelect = useCallback(
    (groupId: string | null) => {
      if (groupId && finalizeConnectionDraft({ kind: 'group', groupId })) {
        return;
      }
      setSelectedGroupId(groupId);
      if (groupId) {
        setActiveNodeId(null);
        setNodeForm(null);
        setContextMenu(null);
        setHoveredEdgeKey(null);
      } else {
        setGroupForm(null);
        setConnectionForm(null);
      }
    },
    [finalizeConnectionDraft, setConnectionForm, setGroupForm, setNodeForm]
  );

  const handleGroupContextMenu = useCallback(
    (event: MouseEvent, group: CanvasGroup) => {
      setContextMenu({
        kind: 'group',
        screenX: event.clientX,
        screenY: event.clientY,
        groupId: group.id,
      });
      setSelectedGroupId(group.id);
      setHoveredGroupId(group.id);
      setActiveNodeId(null);
      setNodeForm(null);
      setConnectionForm(null);
      setHoveredEdgeKey(null);
      setHoveredGroupLinkKey(null);
    },
    [setConnectionForm, setNodeForm]
  );

  const handleGroupDoubleClick = useCallback(
    (group: CanvasGroup) => {
      if (finalizeConnectionDraft({ kind: 'group', groupId: group.id })) {
        return;
      }
      openProfileWindow('group', group.id);
    },
    [finalizeConnectionDraft, openProfileWindow]
  );

  const handleContextMenuDismiss = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    state: {
      connectionDraft,
      connectionBuilderMode,
      activeNodeId,
      hoveredNodeId,
      hoveredEdgeKey,
      hoveredGroupLinkKey,
      hoveredGroupId,
      selectedGroupId,
      contextMenu,
    },
    actions: {
      setConnectionDraft,
      setConnectionBuilderMode,
      setActiveNodeId,
      setHoveredNodeId,
      setHoveredEdgeKey,
      setHoveredGroupLinkKey,
      setHoveredGroupId,
      setSelectedGroupId,
      setContextMenu,
      handleSidebarStartConnection,
      handleCanvasBackgroundClick,
      handleNodeClick,
      handleNodeAuxClick,
      handleNodeDoubleClick,
      handleNodeContextMenu,
      handleEdgeHover,
      handleGroupHover,
      handleGroupLinkHover,
      handleGroupLinkContextMenu,
      handleGroupAuxClick,
      handleGroupSelect,
      handleGroupContextMenu,
      handleGroupDoubleClick,
      handleContextMenuDismiss,
    },
  };
};
