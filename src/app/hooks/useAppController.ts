import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { CanvasViewModel } from '../CanvasView';
import type { TabId } from '../../constants/tabs';
import { applyTheme, baseTheme } from '../../constants/theme';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useGraphPersistence } from '../../hooks/useGraphPersistence';
import { useLayoutVersion } from '../../hooks/useLayoutVersion';
import { resolveId } from '../../lib/graph-utils';
import {
  createDefaultGroupProfile,
  createDefaultNodeProfile,
  getGroupProfileSchema,
  getNodeProfileSchema,
  mergeProfileWithSchema,
} from '../../schemas/resources';
import { applyParentAssignments, groupArea, pointWithinGroup } from '../../lib/groupParenting';
import { sanitizeProfileFieldValue } from '../../lib/profileField';
import type { CanvasGroup, GroupPositionMap, GroupType, NodePositionMap } from '../../types/graph';
import type {
  ConnectionDraft,
  ConnectionFormState,
  ContextMenuState,
  ProfileWindowState,
} from '../../types/appState';
import { useAppStateSlices } from './useAppStateSlices';
import { useNotificationBanner } from './useNotificationBanner';
import { useCanvasInteractions } from './useCanvasInteractions';
import { usePanelState } from './usePanelState';
import { useSidebarActions } from './useSidebarActions';
import { useProfileWindowsController } from './useProfileWindowsController';
import { useDashboardModel } from './useDashboardModel';
import { useCanvasHighlighter } from './useCanvasHighlighter';
import { useContextMenuItems } from './useContextMenuItems';
import { useCanvasViewModel } from './useCanvasViewModel';

const NODE_GROUP_PRIORITY_SCORE: Record<GroupType, number> = {
  subnet: 3,
  virtualNetwork: 2,
  logicalGroup: 1,
};

const createNodeId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createGroupId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const NODE_DUPLICATE_OFFSET = 40; // Offset duplicates so the new node stays visible

const useDispatchProxy = <T,>() => {
  const setterRef = useRef<Dispatch<SetStateAction<T>>>(() => {});
  const proxy = useCallback<Dispatch<SetStateAction<T>>>((value) => {
    setterRef.current(value);
  }, []);
  const attach = useCallback((setter: Dispatch<SetStateAction<T>>) => {
    setterRef.current = setter;
  }, []);
  return { proxy, attach };
};

const useCallbackProxy = <Fn extends (...args: never[]) => void>(fallback?: Fn) => {
  const callbackRef = useRef<Fn>(
    fallback ??
      (((() => {
        /* noop */
      }) as unknown) as Fn)
  );
  const proxy = useCallback((...args: Parameters<Fn>) => {
    callbackRef.current(...args);
  }, []);
  const attach = useCallback((fn: Fn) => {
    callbackRef.current = fn;
  }, []);
  return { proxy, attach };
};

export const useAppController = () => {
  const nodePositionsRef = useRef<NodePositionMap>({});
  const groupPositionsRef = useRef<GroupPositionMap>({});
  const { layoutVersion, publishLayoutChange } = useLayoutVersion();

  const {
    nodes,
    links,
    groupLinks,
    groups,
    setNodes,
    setLinks,
    setGroupLinks,
    setGroups,
    replaceGraph,
  } = useAppStateSlices();
  const [activeTab, setActiveTab] = useState<TabId>('canvas');
  const isCanvasView = activeTab === 'canvas';
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const { proxy: setActiveNodeIdProxy, attach: attachActiveNodeId } = useDispatchProxy<string | null>();
  const { proxy: setHoveredNodeIdProxy, attach: attachHoveredNodeId } = useDispatchProxy<string | null>();
  const { proxy: setHoveredEdgeKeyProxy, attach: attachHoveredEdgeKey } = useDispatchProxy<string | null>();
  const { proxy: setHoveredGroupLinkKeyProxy, attach: attachHoveredGroupLinkKey } =
    useDispatchProxy<string | null>();
  const { proxy: setSelectedGroupIdProxy, attach: attachSelectedGroupId } = useDispatchProxy<string | null>();
  const { proxy: setHoveredGroupIdProxy, attach: attachHoveredGroupId } = useDispatchProxy<string | null>();
  const { proxy: setContextMenuProxy, attach: attachContextMenu } = useDispatchProxy<ContextMenuState | null>();
  const { proxy: setConnectionDraftProxy, attach: attachConnectionDraft } =
    useDispatchProxy<ConnectionDraft | null>();
  const { proxy: handleContextMenuDismissProxy, attach: attachContextMenuDismiss } = useCallbackProxy<() => void>();
  const { proxy: showUtilityToastProxy, attach: attachShowUtilityToast } =
    useCallbackProxy<(message: string) => void>(() => {});
  const lastSyncedConnectionRef = useRef<{
    kind: ConnectionFormState['kind'];
    key: string;
    relation: string;
  } | null>(null);
  const resolveNodeLabel = useCallback(
    (nodeId: string) => {
      const target = nodes.find((node) => node.id === nodeId);
      return target?.label?.trim().length ? target.label : 'this node';
    },
    [nodes]
  );

  const resolveGroupLabel = useCallback(
    (groupId: string) => {
      const target = groups.find((group) => group.id === groupId);
      return target?.title?.trim().length ? target.title : 'this group';
    },
    [groups]
  );

  useEffect(() => {
    applyTheme(baseTheme);
  }, []);

  const handleProfileFieldChange = useCallback(
    (kind: ProfileWindowState['kind'], resourceId: string, fieldKey: string, value: string) => {
      const nextValue = sanitizeProfileFieldValue(value);
      if (nextValue === null) {
        return;
      }
      if (kind === 'node') {
        setNodes((prev) =>
          prev.map((node) => {
            if (node.id !== resourceId) {
              return node;
            }
            const schema = getNodeProfileSchema(node.type);
            const profile = mergeProfileWithSchema(
              schema,
              node.profile ?? createDefaultNodeProfile(node.type)
            );
            return {
              ...node,
              profile: {
                ...profile,
                [fieldKey]: nextValue,
              },
            };
          })
        );
        return;
      }

      setGroups((prev) =>
        prev.map((group) => {
          if (group.id !== resourceId) {
            return group;
          }
          const schema = getGroupProfileSchema(group.type);
          const profile = mergeProfileWithSchema(
            schema,
            group.profile ?? createDefaultGroupProfile(group.type)
          );
          return {
            ...group,
            profile: {
              ...profile,
              [fieldKey]: nextValue,
            },
          };
        })
      );
    },
    [setNodes, setGroups]
  );

  const profileWindowsController = useProfileWindowsController({
    nodes,
    groups,
    links,
    groupLinks,
    onProfileFieldChange: handleProfileFieldChange,
  });
  const {
    profileWindowCount,
    profileContext,
    openProfileWindow,
    closeProfileWindowsByResource,
    closeTopProfileWindow,
  } = profileWindowsController;

  useEffect(() => {
    const existingIds = new Set(nodes.map((node) => node.id));
    Object.keys(nodePositionsRef.current).forEach((id) => {
      if (!existingIds.has(id)) {
        delete nodePositionsRef.current[id];
      }
    });
  }, [nodes]);

  useEffect(() => {
    const existingIds = new Set(groups.map((group) => group.id));
    Object.keys(groupPositionsRef.current).forEach((id) => {
      if (!existingIds.has(id)) {
        delete groupPositionsRef.current[id];
      }
    });
  }, [groups]);

  useEffect(() => {
    if (nodes.length > 0 || groups.length > 0) {
      setWelcomeDismissed(true);
    }
  }, [nodes.length, groups.length]);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (
        (event.target as HTMLElement).closest('.context-menu') ||
        (event.target as HTMLElement).closest('.node-editor')
      ) {
        return;
      }
      handleContextMenuDismissProxy();
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [handleContextMenuDismissProxy]);


  const findBestGroupForPoint = useCallback(
    (point: { x: number; y: number }) => {
      const candidates = groups
        .filter((group) => pointWithinGroup(point, group))
        .sort((a, b) => {
          const priorityDiff =
            (NODE_GROUP_PRIORITY_SCORE[b.type] ?? 0) - (NODE_GROUP_PRIORITY_SCORE[a.type] ?? 0);
          if (priorityDiff !== 0) {
            return priorityDiff;
          }
          return groupArea(a) - groupArea(b);
        });
      return candidates[0]?.id ?? '';
    },
    [groups]
  );

  const assignNodeToGroupByPosition = useCallback(
    (nodeId: string, position?: { x: number; y: number }) => {
      const targetPosition = position ?? nodePositionsRef.current[nodeId];
      if (!targetPosition) {
        return;
      }
      const nextGroupId = findBestGroupForPoint(targetPosition) ?? '';
      setNodes((prev) => {
        let changed = false;
        const next = prev.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }
          if ((node.group ?? '') === nextGroupId) {
            return node;
          }
          changed = true;
          return { ...node, group: nextGroupId };
        });
        return changed ? next : prev;
      });
    },
    [findBestGroupForPoint, setNodes]
  );

  const panelState = usePanelState({
    nodes,
    links,
    groups,
    groupLinks,
    setNodes,
    setLinks,
    setGroups,
    setGroupLinks,
    nodePositionsRef,
    groupPositionsRef,
    assignNodeToGroupByPosition,
    setActiveNodeId: setActiveNodeIdProxy,
    setHoveredNodeId: setHoveredNodeIdProxy,
    setHoveredEdgeKey: setHoveredEdgeKeyProxy,
    setHoveredGroupLinkKey: setHoveredGroupLinkKeyProxy,
    setContextMenu: setContextMenuProxy,
    setSelectedGroupId: setSelectedGroupIdProxy,
    setHoveredGroupId: setHoveredGroupIdProxy,
    setConnectionDraft: setConnectionDraftProxy,
    closeProfileWindowsByResource,
    showUtilityToast: showUtilityToastProxy,
    handleContextMenuDismiss: handleContextMenuDismissProxy,
    createNodeId,
    createGroupId,
    connectionSyncRef: lastSyncedConnectionRef,
  });

  const {
    nodeForm,
    groupForm,
    connectionForm,
    connectionPanel,
    connectionEditorSelection,
    openNodeEditorById,
    openGroupEditor,
    openCreateNodeForm,
    openGroupDraft,
    openConnectionEditorByKey,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    removeNodeById,
    removeGroupById,
    setNodeForm,
    setGroupForm,
    setConnectionForm,
    collapsePanel,
  } = panelState;

  const notificationBanner = useNotificationBanner({
    resolveNodeLabel,
    resolveGroupLabel,
    removeNodeById,
    removeGroupById,
  });
  const {
    pendingDeletion,
    requestNodeRemoval,
    requestGroupRemoval,
    confirmPendingDeletion,
    cancelPendingDeletion,
    showUtilityToast: showUtilityToastActual,
  } = notificationBanner;

  useEffect(() => {
    attachShowUtilityToast(showUtilityToastActual);
  }, [attachShowUtilityToast, showUtilityToastActual]);

  useGraphPersistence({
    nodes,
    links,
    groups,
    groupLinks,
    nodePositionsRef,
    groupPositionsRef,
    replaceGraph,
    layoutVersion,
    notify: showUtilityToastActual,
  });

  const updateGroupById = useCallback(
    (groupId: string, updater: (group: CanvasGroup) => CanvasGroup) => {
      setGroups((prev) =>
        applyParentAssignments(
          prev.map((group) => {
            if (group.id !== groupId) {
              return group;
            }
            const nextGroup = updater(group);
            groupPositionsRef.current[groupId] = {
              x: nextGroup.x + nextGroup.width / 2,
              y: nextGroup.y + nextGroup.height / 2,
            };
            return nextGroup;
          })
        )
      );
    },
    [groupPositionsRef, setGroups]
  );

  const handleGroupMove = useCallback(
    (groupId: string, position: { x: number; y: number }) => {
      updateGroupById(groupId, (group) => ({
        ...group,
        x: position.x,
        y: position.y,
      }));
    },
    [updateGroupById]
  );

  const handleGroupResize = useCallback(
    (groupId: string, geometry: { x: number; y: number; width: number; height: number }) => {
      updateGroupById(groupId, (group) => ({
        ...group,
        ...geometry,
      }));
    },
    [updateGroupById]
  );

  const {
    state: canvasState,
    actions: canvasActions,
    svgRef,
    nodeSelectionRef,
    linkSelectionRef,
    linkLabelSelectionRef,
    handleCanvasContextMenu,
    handleCanvasMouseMove,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    getGraphCenterPosition,
  } = useCanvasInteractions({
    nodes,
    links,
    groupLinks,
    groups,
    setLinks,
    setGroupLinks,
    collapsePanel,
    setConnectionForm,
    setNodeForm,
    setGroupForm,
    showUtilityToast: showUtilityToastProxy,
    openProfileWindow,
    nodePositionsRef,
    groupPositionsRef,
    lastSyncedConnectionRef,
    assignNodeToGroupByPosition,
    publishLayoutChange,
    isCanvasView,
    handleGroupMove,
    handleGroupResize,
    attachActiveNodeId,
    attachHoveredNodeId,
    attachHoveredEdgeKey,
    attachHoveredGroupLinkKey,
    attachHoveredGroupId,
    attachSelectedGroupId,
    attachContextMenu,
    attachConnectionDraft,
    attachContextMenuDismiss,
  });

  const { activeNodeId, hoveredNodeId, hoveredEdgeKey, selectedGroupId, contextMenu } = canvasState;

  const {
    setConnectionDraft,
    setConnectionBuilderMode,
    setActiveNodeId,
    setHoveredNodeId,
    setHoveredEdgeKey,
    setHoveredGroupLinkKey,
    setHoveredGroupId,
    setSelectedGroupId,
    handleSidebarStartConnection,
    handleContextMenuDismiss,
  } = canvasActions;

  const {
    handleSidebarCreateNode,
    handleSidebarCreateGroup,
    handleContextMenuAddNode,
    handleThemeUtilities,
    handleSettingsUtilities,
    handleEmptyStateCreate,
  } = useSidebarActions({
    contextMenu,
    getGraphCenterPosition,
    openCreateNodeForm,
    openGroupDraft,
    showUtilityToast: showUtilityToastProxy,
    setWelcomeDismissed,
  });

  const dashboardViewModel = useDashboardModel({
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
  });

  const duplicateActiveNode = useCallback(() => {
    if (!activeNodeId) {
      return;
    }
    const original = nodes.find((node) => node.id === activeNodeId);
    if (!original) {
      return;
    }
    const originalPosition = nodePositionsRef.current[activeNodeId] ?? { x: 0, y: 0 };
    const newId = createNodeId();
    const newPosition = {
      x: originalPosition.x + NODE_DUPLICATE_OFFSET,
      y: originalPosition.y + NODE_DUPLICATE_OFFSET,
    };
    nodePositionsRef.current[newId] = newPosition;
    setNodes((prev) => [
      ...prev,
      {
        ...original,
        id: newId,
        label: original.label ? `${original.label} Copy` : 'Node Copy',
        profile: mergeProfileWithSchema(getNodeProfileSchema(original.type), original.profile),
      },
    ]);
    setLinks((prev) => {
      const duplicatedSources = prev
        .filter((link) => resolveId(link.source) === activeNodeId)
        .map((link) => ({ ...link, source: newId }));
      const duplicatedTargets = prev
        .filter((link) => resolveId(link.target) === activeNodeId)
        .map((link) => ({ ...link, target: newId }));
      return [...prev, ...duplicatedSources, ...duplicatedTargets];
    });
    setActiveNodeId(newId);
    setHoveredNodeId(newId);
    setHoveredEdgeKey(null);
  }, [
    activeNodeId,
    nodes,
    nodePositionsRef,
    setNodes,
    setLinks,
    mergeProfileWithSchema,
    setActiveNodeId,
    setHoveredNodeId,
    getNodeProfileSchema,
    setHoveredEdgeKey,
  ]);

  useKeyboardShortcuts({
    pendingDeletion,
    cancelPendingDeletion,
    confirmPendingDeletion,
    connectionEditorSelection,
    connectionForm,
    contextMenu,
    handleContextMenuDismiss,
    handleConnectionFormSubmit: connectionPanel.onSubmit,
    nodeForm,
    activeNodeId,
    selectedGroupId,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    requestNodeRemoval,
    requestGroupRemoval,
    setConnectionDraft,
    setConnectionBuilderMode,
    setConnectionForm,
    setNodeForm,
    setActiveNodeId,
    setHoveredNodeId,
    setHoveredEdgeKey,
    setHoveredGroupLinkKey,
    profileWindowCount,
    closeTopProfileWindow,
    onDuplicateActiveNode: duplicateActiveNode,
  });

  const handleGroupDelete = useCallback(() => {
    if (!groupForm) {
      return;
    }
    requestGroupRemoval(groupForm.groupId);
  }, [groupForm, requestGroupRemoval]);

  useCanvasHighlighter({
    nodeSelectionRef,
    linkSelectionRef,
    linkLabelSelectionRef,
    activeNodeId,
    hoveredNodeId,
    hoveredEdgeKey,
    nodes,
    links,
  });

  const contextMenuItems = useContextMenuItems({
    contextMenu,
    links,
    groupLinks,
    onAddNodeAtPosition: handleContextMenuAddNode,
    openProfileWindow,
    openConnectionEditorByKey,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    openGroupEditor,
    requestGroupRemoval,
    openNodeEditorById,
    requestNodeRemoval,
  });

  const sidebarModel = {
    onCreateNode: handleSidebarCreateNode,
    onCreateGroup: handleSidebarCreateGroup,
    onStartConnection: handleSidebarStartConnection,
    onOpenTheme: handleThemeUtilities,
    onOpenSettings: handleSettingsUtilities,
    onEmptyStateCreate: handleEmptyStateCreate,
  };

  const canvasHandlers = {
    canvasRef: svgRef,
    onCanvasContextMenu: handleCanvasContextMenu,
    onCanvasMouseMove: handleCanvasMouseMove,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetZoom: handleResetZoom,
  };

  const contextMenuModel = {
    state: contextMenu,
    items: contextMenuItems,
    onRequestClose: handleContextMenuDismiss,
  };

  const canvasViewModel: CanvasViewModel = useCanvasViewModel({
    nodes,
    groups,
    welcomeDismissed,
    sidebar: sidebarModel,
    canvas: canvasHandlers,
    contextMenu: contextMenuModel,
    profileWindows: profileWindowsController,
    panelState,
    notification: notificationBanner,
    requestNodeRemoval,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    handleGroupDelete,
  });

  return {
    activeTab,
    setActiveTab,
    isCanvasView,
    canvasViewModel,
    dashboardViewModel,
  };
};

