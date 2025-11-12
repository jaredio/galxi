import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { ZoomTransform } from 'd3';
import * as d3 from 'd3';

import './App.css';

import { ContextMenu } from './components/ContextMenu';
import { EmptyState } from './components/EmptyState';
import { GalxiSidebar } from './components/GalxiSidebar';
import { ConnectionEditorPanel } from './components/ConnectionEditorPanel';
import { GroupEditorPanel } from './components/GroupEditorPanel';
import { NodeEditorPanel, type NodeConnection, type NodeFormValues } from './components/NodeEditorPanel';
import { ProfileWindow } from './components/ProfileWindow';
import { DashboardPage, type DashboardEntity } from './components/DashboardPage';
import { Topbar } from './components/Topbar';
import { ZoomControls } from './components/ZoomControls';
import {
  NODE_ACTIVE_RADIUS,
  NODE_BASE_RADIUS,
  NODE_HOVER_RADIUS,
  LABEL_OFFSET,
  LINK_SOURCE_PADDING,
  LINK_TARGET_PADDING,
  LINK_BASE_WIDTH,
} from './constants/graph';
import { nodeTypeOptions } from './constants/nodeOptions';
import type { TabId } from './constants/tabs';
import { accent, applyTheme, baseTheme, edgeBase, textPrimary, textSecondary } from './constants/theme';
import { useForceGraph } from './hooks/useForceGraph';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useGraphPersistence } from './hooks/useGraphPersistence';
import { usePanelLayout } from './hooks/usePanelLayout';
import { useContextMenuItems } from './hooks/useContextMenuItems';
import { useProfileWindows } from './hooks/useProfileWindows';
import {
  linkTouchesNode,
  makeEdgeKey,
  makeGroupLinkKey,
  makeLinkKey,
  resolveAxis,
  resolveId,
  shortenSegment,
} from './lib/graph-utils';
import { generateDashboardSummary } from './lib/dashboardData';
import { buildGroupProfileContent, buildNodeProfileContent } from './lib/profileData';
import {
  createDefaultGroupProfile,
  createDefaultNodeProfile,
  getGroupProfileSchema,
  getNodeProfileSchema,
  mergeProfileWithSchema,
} from './schemas/resources';
import { applyParentAssignments, groupArea, pointWithinGroup } from './lib/groupParenting';
import {
  sanitizeInput,
  validateGroupTitle,
  validateLabel,
  validateProfileField,
  validateRelation,
} from './lib/validation';
import type {
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  GroupType,
  NodePositionMap,
  NodeType,
  SimulationLink,
  SimulationNode,
} from './types/graph';
import type { ProfileFormSection, ResourceProfileData } from './types/profile';
import { useGraphStore } from './state/graphStore';
import type {
  ConnectionDraft,
  ConnectionEditorSelection,
  ConnectionFormState,
  ContextMenuState,
  GroupFormState,
  GroupFormValues,
  NodeFormState,
  PendingDeletion,
  ProfileWindowState,
} from './types/appState';

type GroupDraftType = GroupType;

const groupDraftPresets: Record<GroupDraftType, { title: string }> = {
  virtualNetwork: { title: 'New Virtual Network' },
  subnet: { title: 'New Subnet' },
  logicalGroup: { title: 'New Logical Group' },
};

const NODE_GROUP_PRIORITY_SCORE: Record<GroupType, number> = {
  subnet: 3,
  virtualNetwork: 2,
  logicalGroup: 1,
};

type UtilityToastState = { id: number; message: string };
const createNodeId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createGroupId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const NODE_DUPLICATE_OFFSET = 40; // Offset duplicates so the new node stays visible

const App = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomTransformRef = useRef<ZoomTransform>(d3.zoomIdentity);
  const nodePositionsRef = useRef<NodePositionMap>({});
  const groupPositionsRef = useRef<GroupPositionMap>({});

  const nodes = useGraphStore((state) => state.nodes);
  const links = useGraphStore((state) => state.links);
  const groupLinks = useGraphStore((state) => state.groupLinks);
  const groups = useGraphStore((state) => state.groups);
  const setNodes = useGraphStore((state) => state.setNodes);
  const setLinks = useGraphStore((state) => state.setLinks);
  const setGroupLinks = useGraphStore((state) => state.setGroupLinks);
  const setGroups = useGraphStore((state) => state.setGroups);
  const replaceGraph = useGraphStore((state) => state.replaceGraph);
  const [activeTab, setActiveTab] = useState<TabId>('canvas');
  const isCanvasView = activeTab === 'canvas';
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);
  const [hoveredGroupLinkKey, setHoveredGroupLinkKey] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [nodeForm, setNodeForm] = useState<NodeFormState | null>(null);
  const [formValues, setFormValues] = useState<NodeFormValues>({
    label: '',
    type: 'vm',
    group: '',
  });
  const [nodeProfileDraft, setNodeProfileDraft] = useState<ResourceProfileData>(() =>
    createDefaultNodeProfile('vm')
  );
  const [groupProfileDraft, setGroupProfileDraft] = useState<ResourceProfileData>(() =>
    createDefaultGroupProfile('virtualNetwork')
  );
  useEffect(() => {
    if (!nodeForm || nodeForm.mode !== 'edit') {
      return;
    }
    const currentNode = nodes.find((node) => node.id === nodeForm.nodeId);
    if (!currentNode) {
      return;
    }
    const normalizedGroup = currentNode.group ?? '';
    setFormValues((prev) => (prev.group === normalizedGroup ? prev : { ...prev, group: normalizedGroup }));
  }, [nodeForm, nodes]);
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [groupForm, setGroupForm] = useState<GroupFormState | null>(null);
  const [groupFormValues, setGroupFormValues] = useState<GroupFormValues>({
    title: '',
    type: 'virtualNetwork',
  });
  const previousHighlightRef = useRef<{
    activeNodeId: string | null;
    hoveredNodeId: string | null;
    hoveredEdgeKey: string | null;
  }>({ activeNodeId: null, hoveredNodeId: null, hoveredEdgeKey: null });
  const {
    panelGeometry,
    panelExpanded,
    collapsePanel,
    ensurePanelVisible,
    handlePanelMove,
    handlePanelResize,
    handlePanelToggleExpand,
  } = usePanelLayout();
  const [utilityToast, setUtilityToast] = useState<UtilityToastState | null>(null);
  const [connectionForm, setConnectionForm] = useState<ConnectionFormState | null>(null);
  const lastSyncedConnectionRef = useRef<{
    kind: ConnectionFormState['kind'];
    key: string;
    relation: string;
  } | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
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
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [groupDraft, setGroupDraft] = useState<CanvasGroup | null>(null);
  const [connectionBuilderMode, setConnectionBuilderMode] = useState(false);
  const profileContext = useMemo(
    () => ({
      nodes,
      groups,
      links,
      groupLinks,
    }),
    [nodes, groups, links, groupLinks]
  );
  const dashboardSummary = useMemo(
    () => generateDashboardSummary({ nodes, links, groups, groupLinks }),
    [nodes, links, groups, groupLinks]
  );

  const handleDashboardEntityFocus = useCallback(
    (entity: DashboardEntity) => {
      setActiveTab('canvas');
      if (entity.kind === 'node') {
        setActiveNodeId(entity.id);
        const targetNode = nodes.find((node) => node.id === entity.id);
        if (targetNode?.group) {
          setSelectedGroupId(targetNode.group);
        }
        return;
      }
      setActiveNodeId(null);
      setSelectedGroupId(entity.id);
    },
    [nodes, setActiveNodeId, setSelectedGroupId, setActiveTab]
  );

  useEffect(() => {
    applyTheme(baseTheme);
  }, []);

  const handleProfileFieldChange = useCallback(
    (kind: ProfileWindowState['kind'], resourceId: string, fieldKey: string, value: string) => {
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
                [fieldKey]: value,
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
              [fieldKey]: value,
            },
          };
        })
      );
    },
    [setNodes, setGroups]
  );

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
      setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
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

  useEffect(() => {
    if (!groupForm) {
      return;
    }
    const target = groups.find((group) => group.id === groupForm.groupId);
    if (!target) {
      return;
    }
    setGroupFormValues({ title: target.title, type: target.type });
  }, [groupForm, groups]);

  const handleContextMenuDismiss = useCallback(() => {
    setContextMenu(null);
  }, []);

  const showUtilityToast = useCallback((message: string) => {
    setUtilityToast({ id: Date.now(), message });
  }, []);

  const handlePersistenceRestore = useCallback(
    (restored: { timestamp: string }) => {
      setWelcomeDismissed(true);
      showUtilityToast(`Restored from: ${formatTimestamp(restored.timestamp)}.`);
    },
    [showUtilityToast]
  );

  useGraphPersistence({
    nodes,
    links,
    groups,
    groupLinks,
    nodePositionsRef,
    groupPositionsRef,
    replaceGraph,
    notify: showUtilityToast,
    onRestore: handlePersistenceRestore,
  });

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const handleEdgeHover = useCallback((edgeKey: string | null) => {
    setHoveredEdgeKey(edgeKey);
  }, []);

  const handleThemeUtilities = useCallback(() => {
    showUtilityToast('Theme controls coming soon.');
  }, [showUtilityToast]);

  const handleSettingsUtilities = useCallback(() => {
    showUtilityToast('Settings panel coming soon.');
  }, [showUtilityToast]);

  const handleSidebarStartConnection = useCallback(() => {
    setConnectionDraft(null);
    setConnectionBuilderMode(true);
    showUtilityToast('Select the source node to start a connection.');
  }, [showUtilityToast]);

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

  useEffect(() => {
    setNodes((prev) => {
      let changed = false;
      const next = prev.map((node) => {
        const position = nodePositionsRef.current[node.id];
        if (!position) {
          return node;
        }
        const nextGroupId = findBestGroupForPoint(position) ?? '';
        if ((node.group ?? '') === nextGroupId) {
          return node;
        }
        changed = true;
        return { ...node, group: nextGroupId };
      });
      return changed ? next : prev;
    });
  }, [findBestGroupForPoint, groups, setNodes]);

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
  }, []);

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
      connectionDraft,
      links,
      setLinks,
      groupLinks,
      setGroupLinks,
      setActiveNodeId,
      setHoveredNodeId,
      setHoveredEdgeKey,
      setHoveredGroupLinkKey,
      setContextMenu,
      setConnectionForm,
      setSelectedGroupId,
      setHoveredGroupId,
      collapsePanel,
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
    [connectionBuilderMode, connectionDraft, finalizeConnectionDraft, showUtilityToast]
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
    [finalizeConnectionDraft]
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

  const handleNodeDragEnd = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      assignNodeToGroupByPosition(nodeId, position);
    },
    [assignNodeToGroupByPosition]
  );

  const handleNodeContextMenu = useCallback((event: MouseEvent, node: SimulationNode) => {
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
  }, [setHoveredEdgeKey, setSelectedGroupId, setGroupForm, setHoveredGroupId]);

  const openNodeEditorById = useCallback(
    (nodeId: string) => {
      const target = nodes.find((candidate) => candidate.id === nodeId);
      if (!target) {
        return;
      }
      setFormValues({
        label: target.label,
        type: target.type,
        group: target.group,
      });
      setNodeProfileDraft(
        mergeProfileWithSchema(getNodeProfileSchema(target.type), target.profile ?? createDefaultNodeProfile(target.type))
      );
      setNodeForm({
        mode: 'edit',
        nodeId,
      });
      setConnectionForm(null);
      setActiveNodeId(nodeId);
      setHoveredNodeId(nodeId);
      setContextMenu(null);
      ensurePanelVisible();
      setSelectedGroupId(null);
      setGroupForm(null);
      setHoveredGroupId(null);
    },
    [nodes, ensurePanelVisible]
  );

  const handleLabelChange = useCallback((value: string) => {
    setFormValues((prev) => ({ ...prev, label: value }));
  }, []);

  const handleTypeChange = useCallback(
    (value: NodeFormValues['type']) => {
      setFormValues((prev) => ({ ...prev, type: value }));
      setNodeProfileDraft(createDefaultNodeProfile(value));
    },
    []
  );

  const handleNodeProfileFieldChange = useCallback((fieldKey: string, value: string) => {
    const result = validateProfileField(value);
    if (!result.valid) {
      return;
    }
    const nextValue = result.value ?? '';
    setNodeProfileDraft((prev) => {
      if (prev[fieldKey] === nextValue) {
        return prev;
      }
      return { ...prev, [fieldKey]: nextValue };
    });
  }, []);

  const removeNodeById = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setLinks((prev) => prev.filter((link) => link.source !== nodeId && link.target !== nodeId));
    setConnectionDraft((current) => {
      if (current?.kind === 'node' && current.sourceNodeId === nodeId) {
        return null;
      }
      return current;
    });
    setNodeForm((current) => {
      if (current && current.mode === 'edit' && current.nodeId === nodeId) {
        return null;
      }
      return current;
    });
    delete nodePositionsRef.current[nodeId];
    setActiveNodeId((current) => (current === nodeId ? null : current));
    setHoveredNodeId((current) => (current === nodeId ? null : current));
    setHoveredEdgeKey(null);
    setHoveredGroupLinkKey(null);
    setContextMenu(null);
    setConnectionForm(null);
    closeProfileWindowsByResource('node', nodeId);
  }, [closeProfileWindowsByResource]);

  const handleConnectionRelationChange = useCallback(
    (key: string, relation: string) => {
      const result = validateRelation(relation);
      const value = result.value ?? '';
      setLinks((prev) =>
        prev.map((link) => (makeLinkKey(link) === key ? { ...link, relation: value } : link))
      );
    },
    [setLinks]
  );

  const removeConnectionByKey = useCallback(
    (edgeKey: string) => {
      setLinks((prev) => prev.filter((link) => makeLinkKey(link) !== edgeKey));
      setHoveredEdgeKey((current) => (current === edgeKey ? null : current));
      setConnectionForm((current) => (current?.kind === 'node' && current.linkKey === edgeKey ? null : current));
      setContextMenu((current) => {
        if (current && current.kind === 'connection' && current.edgeKey === edgeKey) {
          return null;
        }
        return current;
      });
    },
    [setLinks]
  );

  const removeGroupConnectionByKey = useCallback(
    (linkKey: string) => {
      setGroupLinks((prev) => prev.filter((link) => makeGroupLinkKey(link) !== linkKey));
      setHoveredGroupLinkKey((current) => (current === linkKey ? null : current));
      setConnectionForm((current) =>
        current?.kind === 'group' && current.linkKey === linkKey ? null : current
      );
      setContextMenu((current) => {
        if (current && current.kind === 'group-connection' && current.linkKey === linkKey) {
          return null;
        }
        return current;
      });
    },
    [setGroupLinks]
  );

  const updateGroupById = useCallback((groupId: string, updater: (group: CanvasGroup) => CanvasGroup) => {
    setGroups((prev) => applyParentAssignments(prev.map((group) => (group.id === groupId ? updater(group) : group))));
  }, [setGroups]);

  const removeGroupById = useCallback((groupId: string) => {
    setGroups((prev) => applyParentAssignments(prev.filter((group) => group.id !== groupId)));
    setSelectedGroupId((current) => (current === groupId ? null : current));
    setHoveredGroupId((current) => (current === groupId ? null : current));
    setGroupForm((current) => (current && current.groupId === groupId ? null : current));
    setGroupLinks((prev) =>
      prev.filter((link) => link.sourceGroupId !== groupId && link.targetGroupId !== groupId)
    );
    setConnectionDraft((current) => {
      if (current?.kind === 'group' && current.sourceGroupId === groupId) {
        return null;
      }
      return current;
    });
    setHoveredGroupLinkKey(null);
    delete groupPositionsRef.current[groupId];
    setContextMenu((current) => {
      if (current && current.kind === 'group' && current.groupId === groupId) {
        return null;
      }
      return current;
    });
    closeProfileWindowsByResource('group', groupId);
  }, [
    setGroups,
    setGroupLinks,
    groupPositionsRef,
    setConnectionDraft,
    setHoveredGroupLinkKey,
    setContextMenu,
    closeProfileWindowsByResource,
  ]);

  const requestNodeRemoval = useCallback(
    (nodeId: string) => {
      const target = nodes.find((node) => node.id === nodeId);
      const label = target?.label?.trim().length ? target!.label : 'this node';
      setPendingDeletion({ kind: 'node', id: nodeId, label });
    },
    [nodes]
  );

  const requestGroupRemoval = useCallback(
    (groupId: string) => {
      const target = groups.find((group) => group.id === groupId);
      const label = target?.title?.trim().length ? target!.title : 'this group';
      setPendingDeletion({ kind: 'group', id: groupId, label });
    },
    [groups]
  );

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
    const newPosition = { x: originalPosition.x + NODE_DUPLICATE_OFFSET, y: originalPosition.y + NODE_DUPLICATE_OFFSET };
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
    setLinks((prev) => [
      ...prev,
      ...prev
        .filter((link) => resolveId(link.source) === activeNodeId)
        .map((link) => ({ ...link, source: newId })),
    ]);
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

  const confirmPendingDeletion = useCallback(() => {
    if (!pendingDeletion) {
      return;
    }
    if (pendingDeletion.kind === 'node') {
      removeNodeById(pendingDeletion.id);
      showUtilityToast(`${pendingDeletion.label} deleted.`);
    } else {
      removeGroupById(pendingDeletion.id);
      showUtilityToast(`${pendingDeletion.label} deleted.`);
    }
    setPendingDeletion(null);
  }, [pendingDeletion, removeNodeById, removeGroupById, showUtilityToast]);

  const cancelPendingDeletion = useCallback(() => {
    setPendingDeletion(null);
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
    [
      setConnectionDraft,
      setActiveNodeId,
      setHoveredNodeId,
      setHoveredEdgeKey,
      setSelectedGroupId,
      setHoveredGroupId,
      setConnectionForm,
      setContextMenu,
    ]
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
    [
      finalizeConnectionDraft,
      groupPositionsRef,
      setConnectionDraft,
      setSelectedGroupId,
      setHoveredGroupId,
      setActiveNodeId,
      setHoveredNodeId,
      setHoveredEdgeKey,
      setHoveredGroupLinkKey,
      setContextMenu,
      setConnectionForm,
      setGroupForm,
    ]
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
    [
      finalizeConnectionDraft,
      setActiveNodeId,
      setNodeForm,
      setConnectionForm,
      setContextMenu,
      setHoveredEdgeKey,
      setHoveredGroupLinkKey,
      setGroupForm,
    ]
  );

  const openGroupEditor = useCallback(
    (groupId: string, mode: GroupFormState['mode'] = 'edit') => {
      const target = groups.find((group) => group.id === groupId);
      if (!target) {
        return;
      }
      setGroupFormValues({ title: target.title, type: target.type });
      setGroupProfileDraft(
        mergeProfileWithSchema(
          getGroupProfileSchema(target.type),
          target.profile ?? createDefaultGroupProfile(target.type)
        )
      );
      setGroupForm({ mode, groupId });
      setSelectedGroupId(groupId);
      setActiveNodeId(null);
      setNodeForm(null);
      setConnectionForm(null);
      setContextMenu(null);
      ensurePanelVisible();
    },
    [
      groups,
      setGroupFormValues,
      setGroupForm,
      setSelectedGroupId,
      setActiveNodeId,
      setNodeForm,
      setConnectionForm,
      setContextMenu,
      ensurePanelVisible,
    ]
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
    [
      setContextMenu,
      setSelectedGroupId,
      setHoveredGroupId,
      setActiveNodeId,
      setNodeForm,
      setConnectionForm,
      setHoveredEdgeKey,
      setHoveredGroupLinkKey,
    ]
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

  const handleConnectionRemove = useCallback(
    (key: string) => {
      removeConnectionByKey(key);
    },
    [removeConnectionByKey]
  );

  const {
    nodeSelectionRef,
    linkSelectionRef,
    linkLabelSelectionRef,
    applyZoomScalar,
    resetZoom,
  } = useForceGraph({
    svgRef,
    nodes,
    links,
    groupLinks,
    groups,
    nodePositionsRef,
    groupPositionsRef,
    zoomTransformRef,
    connectionDraft,
    hoveredGroupLinkKey,
    onNodeHover: handleNodeHover,
    onNodeClick: handleNodeClick,
    onNodeDoubleClick: handleNodeDoubleClick,
    onNodeAuxClick: handleNodeAuxClick,
    onNodeDragEnd: handleNodeDragEnd,
    onNodeContextMenu: handleNodeContextMenu,
    onEdgeHover: handleEdgeHover,
    onLinkContextMenu: (event, link) => {
      event.preventDefault();
      const edgeKey = makeEdgeKey(link);
      setConnectionDraft(null);
      setActiveNodeId(null);
       setHoveredGroupLinkKey(null);
      setConnectionForm(null);
      setHoveredEdgeKey(edgeKey);
      setContextMenu({
        kind: 'connection',
        screenX: event.clientX,
        screenY: event.clientY,
        edgeKey,
      });
    },
    onGroupLinkHover: handleGroupLinkHover,
    onGroupLinkContextMenu: handleGroupLinkContextMenu,
    onCanvasClick: handleCanvasBackgroundClick,
    onContextMenuDismiss: handleContextMenuDismiss,
    onGroupHover: handleGroupHover,
    onGroupSelect: handleGroupSelect,
    onGroupAuxClick: handleGroupAuxClick,
    onGroupContextMenu: handleGroupContextMenu,
    onGroupDoubleClick: handleGroupDoubleClick,
    onGroupMove: handleGroupMove,
    onGroupResize: handleGroupResize,
    selectedGroupId,
    hoveredGroupId,
    isActive: isCanvasView,
  });

  const getGraphCoordinates = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      const svgElement = svgRef.current;
      if (!svgElement) {
        return { x: 0, y: 0 };
      }
      const rect = svgElement.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      const centeredX = relativeX - rect.width / 2;
      const centeredY = relativeY - rect.height / 2;
      const transform = zoomTransformRef.current ?? d3.zoomIdentity;
      const [graphX, graphY] = transform.invert([centeredX, centeredY]);
      return { x: graphX, y: graphY };
    },
    []
  );

  const getGraphCenterPosition = useCallback(() => {
    const transform = zoomTransformRef.current ?? d3.zoomIdentity;
    const [x, y] = transform.invert([0, 0]);
    return { x, y };
  }, []);

  const handleCanvasContextMenu = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      event.preventDefault();
      if (!svgRef.current) {
        return;
      }
      const position = getGraphCoordinates(event);
      if (connectionDraft) {
        setConnectionDraft(null);
      }
      setActiveNodeId(null);
      setHoveredNodeId(null);
      setHoveredEdgeKey(null);
      setHoveredGroupLinkKey(null);
      setContextMenu({
        kind: 'canvas',
        screenX: event.clientX,
        screenY: event.clientY,
        graphX: position.x,
        graphY: position.y,
      });
    },
    [connectionDraft, getGraphCoordinates]
  );

  const handleCanvasMouseMove = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      setConnectionDraft((prev) => {
        if (!prev) {
          return prev;
        }
        const position = getGraphCoordinates(event);
        if (position.x === prev.cursor.x && position.y === prev.cursor.y) {
          return prev;
        }
        return {
          ...prev,
          cursor: position,
        };
      });
    },
    [getGraphCoordinates]
  );

  const openCreateNodeForm = useCallback(
    (position: { x: number; y: number }, overrides?: Partial<NodeFormValues>) => {
      const nextType = overrides?.type ?? 'vm';
      setFormValues({
        label: overrides?.label ?? 'New Node',
        type: nextType,
        group: overrides?.group ?? '',
      });
      setNodeProfileDraft(createDefaultNodeProfile(nextType));
      setNodeForm({
        mode: 'create',
        position,
      });
      handleContextMenuDismiss();
      setConnectionForm(null);
      setSelectedGroupId(null);
      setHoveredGroupId(null);
      setGroupForm(null);
      collapsePanel();
    },
    [collapsePanel, handleContextMenuDismiss]
  );

  const handleContextMenuAddNode = useCallback(() => {
    if (!contextMenu || contextMenu.kind !== 'canvas') {
      return;
    }
    openCreateNodeForm({ x: contextMenu.graphX, y: contextMenu.graphY });
  }, [contextMenu, openCreateNodeForm]);

  const handleSidebarCreateNode = useCallback(() => {
    const position = getGraphCenterPosition();
    openCreateNodeForm(position);
  }, [getGraphCenterPosition, openCreateNodeForm]);

  const handleSidebarCreateGroup = useCallback(
    (groupType: GroupDraftType) => {
      const center = getGraphCenterPosition();
      const preset = groupDraftPresets[groupType];
      const width = 360;
      const height = 240;
      const id = createGroupId();
      const nextGroup: CanvasGroup = {
        id,
        type: groupType,
        title: preset.title,
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
        profile: createDefaultGroupProfile(groupType),
      };
      setGroupDraft(nextGroup);
      setHoveredGroupId(null);
      setGroupFormValues({ title: nextGroup.title, type: groupType });
      setGroupProfileDraft(createDefaultGroupProfile(groupType));
      setGroupForm({ mode: 'create', groupId: id });
      setNodeForm(null);
      setConnectionForm(null);
      setContextMenu(null);
      ensurePanelVisible();
    },
    [getGraphCenterPosition, ensurePanelVisible]
  );

  const handleGroupTitleChange = useCallback((value: string) => {
    setGroupFormValues((prev) => ({ ...prev, title: value }));
  }, []);

  const handleGroupTypeChange = useCallback((value: GroupType) => {
    setGroupFormValues((prev) => ({ ...prev, type: value }));
    setGroupProfileDraft((prev) => mergeProfileWithSchema(getGroupProfileSchema(value), prev));
  }, []);

  const handleGroupProfileFieldChange = useCallback((fieldKey: string, value: string) => {
    const result = validateProfileField(value);
    if (!result.valid) {
      return;
    }
    const nextValue = result.value ?? '';
    setGroupProfileDraft((prev) => {
      if (prev[fieldKey] === nextValue) {
        return prev;
      }
      return { ...prev, [fieldKey]: nextValue };
    });
  }, []);

  const connectionEditorSelection = useMemo<ConnectionEditorSelection | null>(() => {
    if (!connectionForm) {
      return null;
    }
    if (connectionForm.kind === 'node') {
      const link = links.find((candidate) => makeLinkKey(candidate) === connectionForm.linkKey);
      if (!link) {
        return null;
      }
      const source = nodes.find((node) => node.id === link.source);
      const target = nodes.find((node) => node.id === link.target);
      return {
        kind: 'node' as const,
        key: makeLinkKey(link),
        relation: link.relation,
        source: source
          ? { kind: 'node' as const, id: source.id, label: source.label, type: source.type }
          : null,
        target: target
          ? { kind: 'node' as const, id: target.id, label: target.label, type: target.type }
          : null,
      };
    }
    const link = groupLinks.find((candidate) => makeGroupLinkKey(candidate) === connectionForm.linkKey);
    const [fallbackSourceId, fallbackTargetId] = connectionForm.linkKey.split('->');
    const relation = link ? link.relation : connectionForm.relation;
    const sourceGroupId = link ? link.sourceGroupId : fallbackSourceId;
    const targetGroupId = link ? link.targetGroupId : fallbackTargetId;
    const sourceGroup = groups.find((group) => group.id === sourceGroupId);
    const targetGroup = groups.find((group) => group.id === targetGroupId);
    return {
      kind: 'group' as const,
      key: connectionForm.linkKey,
      relation,
      source: sourceGroup
        ? { kind: 'group' as const, id: sourceGroup.id, label: sourceGroup.title, type: sourceGroup.type }
        : null,
      target: targetGroup
        ? { kind: 'group' as const, id: targetGroup.id, label: targetGroup.title, type: targetGroup.type }
        : null,
    };
  }, [connectionForm, links, groupLinks, nodes, groups]);

  const connectionEditorSourceOpen = useMemo<(() => void) | undefined>(() => {
    const source = connectionEditorSelection?.source;
    if (!source) {
      return undefined;
    }
    if (source.kind === 'node') {
      const { id } = source;
      return () => openNodeEditorById(id);
    }
    const { id } = source;
    return () => openGroupEditor(id);
  }, [connectionEditorSelection, openGroupEditor, openNodeEditorById]);

  const connectionEditorTargetOpen = useMemo<(() => void) | undefined>(() => {
    const target = connectionEditorSelection?.target;
    if (!target) {
      return undefined;
    }
    if (target.kind === 'node') {
      const { id } = target;
      return () => openNodeEditorById(id);
    }
    const { id } = target;
    return () => openGroupEditor(id);
  }, [connectionEditorSelection, openGroupEditor, openNodeEditorById]);

  useEffect(() => {
    if (!connectionEditorSelection) {
      lastSyncedConnectionRef.current = null;
      return;
    }
    const nextSignature = {
      kind: connectionEditorSelection.kind,
      key: connectionEditorSelection.key,
      relation: connectionEditorSelection.relation,
    };
    const previousSignature = lastSyncedConnectionRef.current;
    if (
      previousSignature &&
      previousSignature.kind === nextSignature.kind &&
      previousSignature.key === nextSignature.key &&
      previousSignature.relation === nextSignature.relation
    ) {
      return;
    }
    lastSyncedConnectionRef.current = nextSignature;
    setConnectionForm((current) => {
      if (
        !current ||
        current.kind !== nextSignature.kind ||
        current.linkKey !== nextSignature.key ||
        current.relation === nextSignature.relation
      ) {
        return current;
      }
      return { ...current, relation: nextSignature.relation };
    });
  }, [connectionEditorSelection]);

  const openConnectionEditorByKey = useCallback(
    (linkKey: string, kind: ConnectionFormState['kind']) => {
      if (kind === 'node') {
        const target = links.find((link) => makeLinkKey(link) === linkKey);
        if (!target) {
          return;
        }
        setNodeForm(null);
        setConnectionForm({
          mode: 'edit',
          kind: 'node',
          linkKey,
          relation: target.relation,
        });
        setHoveredGroupLinkKey(null);
        setHoveredEdgeKey(linkKey);
      } else {
        const target = groupLinks.find((link) => makeGroupLinkKey(link) === linkKey);
        if (!target) {
          return;
        }
        setGroupForm(null);
        setConnectionForm({
          mode: 'edit',
          kind: 'group',
          linkKey,
          relation: target.relation,
        });
        setHoveredEdgeKey(null);
        setHoveredGroupLinkKey(linkKey);
      }
      handleContextMenuDismiss();
      collapsePanel();
    },
    [
      links,
      groupLinks,
      handleContextMenuDismiss,
      collapsePanel,
      setNodeForm,
      setGroupForm,
    ]
  );

  const handleConnectionFormRelationChange = useCallback((value: string) => {
    const result = validateRelation(value);
    const nextValue = result.value ?? '';
    setConnectionForm((current) => (current ? { ...current, relation: nextValue } : current));
  }, []);

  const handleConnectionFormClose = useCallback(() => {
    const selection = connectionEditorSelection;
    setConnectionForm(null);
    if (!selection || selection.relation.trim().length > 0) {
      return;
    }
    if (selection.kind === 'node') {
      removeConnectionByKey(selection.key);
    } else {
      removeGroupConnectionByKey(selection.key);
    }
  }, [connectionEditorSelection, removeConnectionByKey, removeGroupConnectionByKey]);

  const handleConnectionFormSubmit = useCallback(() => {
    setConnectionForm((current) => {
      if (!current) {
        return current;
      }
      const nextRelation = current.relation.trim();
      if (nextRelation.length === 0) {
        showUtilityToast('Relation name is required.');
        return current;
      }
      if (current.kind === 'node') {
        setLinks((prev) =>
          prev.map((link) =>
            makeLinkKey(link) === current.linkKey ? { ...link, relation: nextRelation } : link
          )
        );
      } else {
        setGroupLinks((prev) =>
          prev.map((link) =>
            makeGroupLinkKey(link) === current.linkKey ? { ...link, relation: nextRelation } : link
          )
        );
      }
      return null;
    });
  }, [setLinks, setGroupLinks, showUtilityToast]);

  useKeyboardShortcuts({
    pendingDeletion,
    cancelPendingDeletion,
    confirmPendingDeletion,
    connectionEditorSelection,
    connectionForm,
    contextMenu,
    handleContextMenuDismiss,
    handleConnectionFormSubmit,
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

  const nodeFormType = useMemo<NodeType>(() => {
    if (!nodeForm) {
      return formValues.type;
    }
    if (nodeForm.mode === 'create') {
      return formValues.type;
    }
    const existing = nodes.find((node) => node.id === nodeForm.nodeId);
    return existing?.type ?? formValues.type;
  }, [formValues.type, nodeForm, nodes]);

  const nodeProfileSchema = useMemo(() => getNodeProfileSchema(nodeFormType), [nodeFormType]);
  const nodeProfileSections = useMemo(
    () =>
      nodeProfileSchema.sections.map((section) => ({
        id: section.id,
        title: section.title,
        fields: section.fields.map((field) => ({
          id: field.id,
          label: field.label,
          key: `${section.id}.${field.id}`,
        })),
      })),
    [nodeProfileSchema]
  );
  const groupProfileSchema = useMemo(() => getGroupProfileSchema(groupFormValues.type), [groupFormValues.type]);
  const groupProfileSections = useMemo<ProfileFormSection[]>(
    () =>
      groupProfileSchema.sections.map((section) => ({
        id: section.id,
        title: section.title,
        fields: section.fields.map((field) => ({
          id: field.id,
          label: field.label,
          key: `${section.id}.${field.id}`,
        })),
      })),
    [groupProfileSchema]
  );

  const handleNodeFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!nodeForm) {
        return;
      }
      const labelResult = validateLabel(formValues.label);
      if (!labelResult.valid || !labelResult.value) {
        showUtilityToast(labelResult.error ?? 'Enter a node name to continue.');
        return;
      }
      const label = labelResult.value;
      const group = sanitizeInput(formValues.group, 100);

      if (nodeForm.mode === 'create') {
        const newId = createNodeId();
        nodePositionsRef.current[newId] = { ...nodeForm.position };
        const schema = getNodeProfileSchema(formValues.type);
        const profile = mergeProfileWithSchema(schema, nodeProfileDraft);
        setNodes((prev) => [
          ...prev,
          {
            id: newId,
            label,
            type: formValues.type,
            group,
            profile,
          },
        ]);
        setActiveNodeId(newId);
        setHoveredNodeId(newId);
        setHoveredEdgeKey(null);
        assignNodeToGroupByPosition(newId, nodeForm.position);
      } else if (nodeForm.mode === 'edit' && nodeForm.nodeId) {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === nodeForm.nodeId
              ? {
                  ...node,
                  label,
                  type: formValues.type,
                  group,
                  profile:
                    node.type === formValues.type
                      ? mergeProfileWithSchema(getNodeProfileSchema(formValues.type), node.profile)
                      : createDefaultNodeProfile(formValues.type),
                }
              : node
          )
        );
      }

      setNodeForm(null);
      setNodeProfileDraft(createDefaultNodeProfile('vm'));
    },
    [formValues, nodeForm, nodeProfileDraft, showUtilityToast]
  );

  const handleNodeFormClose = useCallback(() => {
    setNodeForm(null);
    setNodeProfileDraft(createDefaultNodeProfile('vm'));
  }, []);

  const handleGroupFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!groupForm) {
        return;
      }
      const titleResult = validateGroupTitle(groupFormValues.title);
      if (!titleResult.valid || !titleResult.value) {
        showUtilityToast(titleResult.error ?? 'Enter a group name to continue.');
        return;
      }
      const title = titleResult.value;
      const schema = getGroupProfileSchema(groupFormValues.type);
      const mergedProfile = mergeProfileWithSchema(schema, groupProfileDraft);
      if (groupForm.mode === 'create') {
        if (!groupDraft || groupDraft.id !== groupForm.groupId) {
          return;
        }
        const newGroup: CanvasGroup = {
          ...groupDraft,
          title,
          type: groupFormValues.type,
          profile: mergedProfile,
        };
        setGroups((prev) => applyParentAssignments([...prev, newGroup]));
        setGroupDraft(null);
        setGroupForm(null);
        setGroupProfileDraft(createDefaultGroupProfile('virtualNetwork'));
        return;
      }
      updateGroupById(groupForm.groupId, (group) => ({
        ...group,
        title,
        type: groupFormValues.type,
        profile: mergedProfile,
      }));
      setGroupForm(null);
      setGroupProfileDraft(createDefaultGroupProfile('virtualNetwork'));
    },
    [groupForm, groupFormValues, updateGroupById, groupDraft, setGroups, groupProfileDraft, showUtilityToast]
  );

  const handleGroupFormClose = useCallback(() => {
    if (groupForm?.mode === 'create') {
      setGroupDraft(null);
    }
    setGroupForm(null);
    setGroupProfileDraft(createDefaultGroupProfile('virtualNetwork'));
  }, [groupForm]);

  const handleGroupDelete = useCallback(() => {
    if (!groupForm) {
      return;
    }
    requestGroupRemoval(groupForm.groupId);
  }, [groupForm, requestGroupRemoval]);

  const nodeEditorConnections = useMemo<NodeConnection[]>(() => {
    if (!nodeForm || nodeForm.mode !== 'edit') {
      return [];
    }
    const nodeId = nodeForm.nodeId;
    return links
      .filter((link) => link.source === nodeId || link.target === nodeId)
      .map((link) => {
        const direction = link.source === nodeId ? 'outgoing' : 'incoming';
        const peerId = direction === 'outgoing' ? link.target : link.source;
        const peerLabel = nodes.find((node) => node.id === peerId)?.label ?? peerId;
        return {
          key: makeLinkKey(link),
          direction,
          peerLabel,
          relation: link.relation,
        };
      });
  }, [nodeForm, links, nodes]);

  useEffect(() => {
    const nodeSelection = nodeSelectionRef.current;
    const linkSelection = linkSelectionRef.current;
    const linkLabelSelection = linkLabelSelectionRef.current;

    if (!nodeSelection || !linkSelection || !linkLabelSelection) {
      previousHighlightRef.current = { activeNodeId, hoveredNodeId, hoveredEdgeKey };
      return;
    }

    const previous = previousHighlightRef.current;
    const nodesToUpdate = new Set<string>();
    if (previous.activeNodeId) nodesToUpdate.add(previous.activeNodeId);
    if (previous.hoveredNodeId) nodesToUpdate.add(previous.hoveredNodeId);
    if (activeNodeId) nodesToUpdate.add(activeNodeId);
    if (hoveredNodeId) nodesToUpdate.add(hoveredNodeId);

    const nodeRadiusFor = (nodeId: string) => {
      if (nodeId === activeNodeId) {
        return NODE_ACTIVE_RADIUS;
      }
      if (nodeId === hoveredNodeId) {
        return NODE_HOVER_RADIUS;
      }
      return NODE_BASE_RADIUS;
    };

    if (nodesToUpdate.size > 0) {
      const subset = nodeSelection.filter((datum: SimulationNode) => nodesToUpdate.has(datum.id));
      subset
        .classed('node--active', (datum: SimulationNode) => datum.id === activeNodeId)
        .classed('node--hovered', (datum: SimulationNode) => datum.id === hoveredNodeId);

      subset
        .select<SVGCircleElement>('circle.node-hit-area')
        .attr('r', (datum: SimulationNode) => nodeRadiusFor(datum.id) + 12);

      subset
        .select<SVGImageElement>('image.node-icon')
        .attr('x', (datum: SimulationNode) => -nodeRadiusFor(datum.id))
        .attr('y', (datum: SimulationNode) => -nodeRadiusFor(datum.id))
        .attr('width', (datum: SimulationNode) => nodeRadiusFor(datum.id) * 2)
        .attr('height', (datum: SimulationNode) => nodeRadiusFor(datum.id) * 2)
        .attr('filter', (datum: SimulationNode) =>
          datum.id === activeNodeId || datum.id === hoveredNodeId ? 'url(#node-active-glow)' : null
        );

      subset
        .select<SVGTextElement>('text.node-label')
        .attr('y', (datum: SimulationNode) => nodeRadiusFor(datum.id) + LABEL_OFFSET)
        .attr('fill', (datum: SimulationNode) => (datum.id === activeNodeId ? textPrimary : textSecondary));
    }

    const edgeSubset = linkSelection.filter((datum: SimulationLink) => {
      const sourceId = resolveId(datum.source);
      const targetId = resolveId(datum.target);

      if (nodesToUpdate.has(sourceId) || nodesToUpdate.has(targetId)) {
        return true;
      }

      const edgeKey = makeEdgeKey(datum);
      return edgeKey === hoveredEdgeKey || edgeKey === previous.hoveredEdgeKey;
    });

    edgeSubset.each(function updateEdge(this: SVGLineElement, datum: SimulationLink) {
      const sourceX = resolveAxis(datum.source, 'x');
      const sourceY = resolveAxis(datum.source, 'y');
      const targetX = resolveAxis(datum.target, 'x');
      const targetY = resolveAxis(datum.target, 'y');
      const highlighted =
        linkTouchesNode(datum, activeNodeId) || makeEdgeKey(datum) === hoveredEdgeKey;
      const strokeWidth = LINK_BASE_WIDTH;

      const sourceRadius = nodeRadiusFor(resolveId(datum.source));
      const targetRadius = nodeRadiusFor(resolveId(datum.target));

      const { sx, sy, tx, ty } = shortenSegment(
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourceRadius + LINK_SOURCE_PADDING + strokeWidth / 2,
        targetRadius + LINK_TARGET_PADDING + strokeWidth / 2
      );

      d3.select<SVGLineElement, SimulationLink>(this)
        .attr('x1', sx)
        .attr('y1', sy)
        .attr('x2', tx)
        .attr('y2', ty)
        .attr('stroke', highlighted ? accent : edgeBase)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-opacity', highlighted ? 0.95 : 0.35)
        .attr('marker-end', highlighted ? 'url(#arrowhead-accent)' : 'url(#arrowhead-base)')
        .classed('link-line--highlighted', highlighted);
    });

    const labelSubset = linkLabelSelection.filter((datum: SimulationLink) => {
      const sourceId = resolveId(datum.source);
      const targetId = resolveId(datum.target);

      if (nodesToUpdate.has(sourceId) || nodesToUpdate.has(targetId)) {
        return true;
      }

      const edgeKey = makeEdgeKey(datum);
      return edgeKey === hoveredEdgeKey || edgeKey === previous.hoveredEdgeKey;
    });

    labelSubset
      .attr('x', (datum: SimulationLink) => {
        const sourceX = resolveAxis(datum.source, 'x');
        const targetX = resolveAxis(datum.target, 'x');
        return (sourceX + targetX) / 2;
      })
      .attr('y', (datum: SimulationLink) => {
        const sourceY = resolveAxis(datum.source, 'y');
        const targetY = resolveAxis(datum.target, 'y');
        return (sourceY + targetY) / 2;
      })
      .attr('fill', (datum: SimulationLink) =>
        linkTouchesNode(datum, activeNodeId) || makeEdgeKey(datum) === hoveredEdgeKey ? accent : textSecondary
      )
      .attr('font-weight', (datum: SimulationLink) =>
        linkTouchesNode(datum, activeNodeId) || makeEdgeKey(datum) === hoveredEdgeKey ? 600 : 500
      )
      .attr('opacity', (datum: SimulationLink) =>
        linkTouchesNode(datum, activeNodeId) || makeEdgeKey(datum) === hoveredEdgeKey ? 1 : 0.35
      );

    previousHighlightRef.current = { activeNodeId, hoveredNodeId, hoveredEdgeKey };
  }, [
    activeNodeId,
    hoveredNodeId,
    hoveredEdgeKey,
    nodes,
    links,
    accent,
    edgeBase,
    textPrimary,
    textSecondary,
  ]);

  const handleZoomIn = useCallback(() => {
    applyZoomScalar(1.25);
  }, [applyZoomScalar]);

  const handleZoomOut = useCallback(() => {
    applyZoomScalar(0.8);
  }, [applyZoomScalar]);

  const handleResetZoom = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

  const handleEmptyStateCreate = useCallback(() => {
    handleSidebarCreateNode();
    setWelcomeDismissed(true);
  }, [handleSidebarCreateNode]);

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

  const showWelcome = !welcomeDismissed && nodes.length === 0 && groups.length === 0;

  return (
    <div className="app">
      <Topbar activeTab={activeTab} onSelectTab={setActiveTab} />
      {isCanvasView ? (
        <>
          <GalxiSidebar
            onCreateNode={handleSidebarCreateNode}
            onCreateGroup={handleSidebarCreateGroup}
            onStartConnection={handleSidebarStartConnection}
            onOpenTheme={handleThemeUtilities}
            onOpenSettings={handleSettingsUtilities}
          />

          <main className="canvas-shell view-fade">
            <svg
              ref={svgRef}
              className="mindmap-canvas"
              onContextMenu={handleCanvasContextMenu}
              onMouseMove={handleCanvasMouseMove}
            />

            {showWelcome && <EmptyState onCreateNode={handleEmptyStateCreate} />}

            <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetZoom} />

            {contextMenu && contextMenuItems.length > 0 && (
              <ContextMenu
                x={contextMenu.screenX}
                y={contextMenu.screenY}
                items={contextMenuItems}
                onRequestClose={handleContextMenuDismiss}
              />
            )}

            {profileWindows.map((window) => {
              if (window.kind === 'node') {
                const targetNode = nodes.find((node) => node.id === window.resourceId);
                if (!targetNode) {
                  return null;
                }
                const content = buildNodeProfileContent(targetNode, profileContext);
                return (
                  <ProfileWindow
                    key={window.id}
                    {...content}
                    position={window.position}
                    zIndex={window.zIndex}
                    startEditNonce={window.editNonce}
                    onMove={(position) => moveProfileWindow(window.id, position)}
                  onClose={() => closeProfileWindowById(window.id)}
                  onFocus={() => focusProfileWindow(window.id)}
                  onFieldChange={(fieldKey, value) =>
                    handleProfileFieldChange('node', window.resourceId, fieldKey, value)
                  }
                />
              );
              }
              const targetGroup = groups.find((group) => group.id === window.resourceId);
              if (!targetGroup) {
                return null;
              }
              const content = buildGroupProfileContent(targetGroup, profileContext);
              return (
                <ProfileWindow
                  key={window.id}
                  {...content}
                  position={window.position}
                  zIndex={window.zIndex}
                  startEditNonce={window.editNonce}
                  onMove={(position) => moveProfileWindow(window.id, position)}
                  onClose={() => closeProfileWindowById(window.id)}
                  onFocus={() => focusProfileWindow(window.id)}
                  onFieldChange={(fieldKey, value) =>
                    handleProfileFieldChange('group', window.resourceId, fieldKey, value)
                  }
                />
              );
            })}
          </main>

          {nodeForm && (
            <NodeEditorPanel
              mode={nodeForm.mode}
              values={formValues}
              nodeType={nodeFormType}
              onLabelChange={handleLabelChange}
              onTypeChange={handleTypeChange}
              onClose={handleNodeFormClose}
              onSubmit={handleNodeFormSubmit}
              onDeleteNode={() => {
                if (nodeForm.mode === 'edit') {
                  requestNodeRemoval(nodeForm.nodeId);
                }
              }}
              nodeTypeOptions={nodeTypeOptions}
              profileDraft={nodeProfileDraft}
              profileSections={nodeProfileSections}
              onProfileFieldChange={handleNodeProfileFieldChange}
              connections={nodeEditorConnections}
              onConnectionRelationChange={handleConnectionRelationChange}
              onConnectionRemove={handleConnectionRemove}
              position={{ x: panelGeometry.x, y: panelGeometry.y }}
              size={{ width: panelGeometry.width, height: panelGeometry.height }}
              onMove={handlePanelMove}
              onResize={handlePanelResize}
              onToggleExpand={handlePanelToggleExpand}
              isExpanded={panelExpanded}
            />
          )}

          {!nodeForm && connectionForm && connectionEditorSelection && (
            <ConnectionEditorPanel
              relation={connectionForm.relation}
              onRelationChange={handleConnectionFormRelationChange}
              onSubmit={handleConnectionFormSubmit}
              onClose={handleConnectionFormClose}
              onDelete={() =>
                connectionForm.kind === 'node'
                  ? removeConnectionByKey(connectionForm.linkKey)
                  : removeGroupConnectionByKey(connectionForm.linkKey)
              }
              sourceEndpoint={connectionEditorSelection.source}
              targetEndpoint={connectionEditorSelection.target}
              onOpenSourceEndpoint={connectionEditorSourceOpen}
              onOpenTargetEndpoint={connectionEditorTargetOpen}
              position={{ x: panelGeometry.x, y: panelGeometry.y }}
              size={{ width: panelGeometry.width, height: panelGeometry.height }}
              onMove={handlePanelMove}
              onResize={handlePanelResize}
              onToggleExpand={handlePanelToggleExpand}
              isExpanded={panelExpanded}
            />
          )}

          {!nodeForm && !connectionForm && groupForm && (
            <GroupEditorPanel
              mode={groupForm.mode}
              values={groupFormValues}
              onTitleChange={handleGroupTitleChange}
              onTypeChange={handleGroupTypeChange}
              onClose={handleGroupFormClose}
              onSubmit={handleGroupFormSubmit}
              onDelete={groupForm.mode === 'edit' ? handleGroupDelete : undefined}
              position={{ x: panelGeometry.x, y: panelGeometry.y }}
              size={{ width: panelGeometry.width, height: panelGeometry.height }}
              onMove={handlePanelMove}
              onResize={handlePanelResize}
              onToggleExpand={handlePanelToggleExpand}
              isExpanded={panelExpanded}
              profileDraft={groupProfileDraft}
              profileSections={groupProfileSections}
              onProfileFieldChange={handleGroupProfileFieldChange}
            />
          )}

          {utilityToast && (
            <div className="utility-toast" role="status">
              {utilityToast.message}
            </div>
          )}
        </>
      ) : (
        <DashboardPage
          data={dashboardSummary}
          nodes={nodes}
          groups={groups}
          links={links}
          groupLinks={groupLinks}
          onFocusOnCanvas={handleDashboardEntityFocus}
          profileContext={profileContext}
        />
      )}

      {pendingDeletion && (
        <div
          className="deletion-banner"
          role="alertdialog"
          aria-live="assertive"
          aria-label="Delete resource confirmation"
        >
          <div className="deletion-banner__body">
            <p>
              Delete <strong>{pendingDeletion.label}</strong>? This removes the{' '}
              {pendingDeletion.kind === 'node'
                ? 'resource and its connections.'
                : 'group, nested links, and placement data.'}
            </p>
            <div className="deletion-banner__actions">
              <button type="button" className="btn" onClick={cancelPendingDeletion}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmPendingDeletion}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;






