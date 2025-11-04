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
import { EditIcon, PlusIcon, TrashIcon } from './components/icons';
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
import {
  linkTouchesNode,
  makeEdgeKey,
  makeGroupLinkKey,
  makeLinkKey,
  resolveAxis,
  resolveId,
  shortenSegment,
} from './lib/graph-utils';
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
import { useGraphStore } from './state/graphStore';

type CanvasContextMenuState = {
  kind: 'canvas';
  screenX: number;
  screenY: number;
  graphX: number;
  graphY: number;
};

type NodeContextMenuState = {
  kind: 'node';
  screenX: number;
  screenY: number;
  nodeId: string;
};

type ConnectionContextMenuState = {
  kind: 'connection';
  screenX: number;
  screenY: number;
  edgeKey: string;
};

type GroupConnectionContextMenuState = {
  kind: 'group-connection';
  screenX: number;
  screenY: number;
  linkKey: string;
};

type GroupContextMenuState = {
  kind: 'group';
  screenX: number;
  screenY: number;
  groupId: string;
};

type ContextMenuState =
  | CanvasContextMenuState
  | NodeContextMenuState
  | ConnectionContextMenuState
  | GroupConnectionContextMenuState
  | GroupContextMenuState;

type NodeFormState =
  | {
      mode: 'create';
      position: { x: number; y: number };
    }
  | {
      mode: 'edit';
      nodeId: string;
    };

type ConnectionDraft =
  | {
      kind: 'node';
      sourceNodeId: string;
      cursor: { x: number; y: number };
    }
  | {
      kind: 'group';
      sourceGroupId: string;
      cursor: { x: number; y: number };
    };

type GroupFormState =
  | {
      mode: 'create';
      groupId: string;
    }
  | {
      mode: 'edit';
      groupId: string;
    };

type GroupFormValues = {
  title: string;
  type: GroupType;
};

type GroupDraftType = GroupType;

const groupDraftPresets: Record<GroupDraftType, { title: string }> = {
  virtualNetwork: { title: 'New Virtual Network' },
  subnet: { title: 'New Subnet' },
  logicalGroup: { title: 'New Logical Group' },
};

type UtilityToastState = { id: number; message: string };
type ConnectionFormState =
  | {
      mode: 'edit';
      kind: 'node';
      linkKey: string;
      relation: string;
    }
  | {
      mode: 'edit';
      kind: 'group';
      linkKey: string;
      relation: string;
    };
const createNodeId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createGroupId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const App = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomTransformRef = useRef<ZoomTransform>(d3.zoomIdentity);
  const nodePositionsRef = useRef<NodePositionMap>({});
  const groupPositionsRef = useRef<GroupPositionMap>({});
  const panelViewportRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const nodes = useGraphStore((state) => state.nodes);
  const links = useGraphStore((state) => state.links);
  const groupLinks = useGraphStore((state) => state.groupLinks);
  const groups = useGraphStore((state) => state.groups);
  const setNodes = useGraphStore((state) => state.setNodes);
  const setLinks = useGraphStore((state) => state.setLinks);
  const setGroupLinks = useGraphStore((state) => state.setGroupLinks);
  const setGroups = useGraphStore((state) => state.setGroups);
  const [activeTab, setActiveTab] = useState<TabId>('canvas');
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
  const [panelGeometry, setPanelGeometry] = useState<{ x: number; y: number; width: number; height: number }>(() => ({
    x: 72,
    y: 96,
    width: 360,
    height: 460,
  }));
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [utilityToast, setUtilityToast] = useState<UtilityToastState | null>(null);
  const [connectionForm, setConnectionForm] = useState<ConnectionFormState | null>(null);
  const lastSyncedConnectionRef = useRef<{
    kind: ConnectionFormState['kind'];
    key: string;
    relation: string;
  } | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  useEffect(() => {
    applyTheme(baseTheme);
  }, []);

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

  const clampPanelGeometry = useCallback(
    (geometry: { x: number; y: number; width: number; height: number }) => {
      const viewport = panelViewportRef.current;
      const minWidth = 280;
      const minHeight = 240;
      const maxWidth = 600;
      const maxHeight = Math.max(minHeight, viewport.height ? viewport.height - 120 : 720);
      const width = Math.min(Math.max(geometry.width, minWidth), maxWidth);
      const height = Math.min(Math.max(geometry.height, minHeight), maxHeight);
      const maxX = Math.max(0, (viewport.width || width) - width - 24);
      const maxY = Math.max(0, (viewport.height || height) - height - 24);
      const x = Math.min(Math.max(geometry.x, 24), maxX);
      const y = Math.min(Math.max(geometry.y, 72), maxY);
      return { x, y, width, height };
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const updateViewport = () => {
      panelViewportRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setPanelGeometry((prev) => clampPanelGeometry(prev));
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [clampPanelGeometry]);

  const handleContextMenuDismiss = useCallback(() => {
    setContextMenu(null);
  }, []);

  const showUtilityToast = useCallback((message: string) => {
    setUtilityToast({ id: Date.now(), message });
  }, []);

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

  const handleCanvasBackgroundClick = useCallback(() => {
    setConnectionDraft(null);
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
          setPanelExpanded(false);
          setPanelGeometry((prev) => clampPanelGeometry(prev));
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
          setPanelExpanded(false);
          setPanelGeometry((prev) => clampPanelGeometry(prev));
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
      clampPanelGeometry,
      setPanelGeometry,
      setPanelExpanded,
    ]
  );

  const handleNodeClick = useCallback(
    (node: SimulationNode) => {
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
    [finalizeConnectionDraft]
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
      setNodeForm({
        mode: 'edit',
        nodeId,
      });
      setConnectionForm(null);
      setActiveNodeId(nodeId);
      setHoveredNodeId(nodeId);
      setContextMenu(null);
      setPanelGeometry((prev) => clampPanelGeometry(prev));
      setSelectedGroupId(null);
      setGroupForm(null);
      setHoveredGroupId(null);
    },
    [nodes, clampPanelGeometry]
  );

  const openEditNodeForm = useCallback(
    (node: SimulationNode) => {
      openNodeEditorById(node.id);
    },
    [openNodeEditorById]
  );

  const handleLabelChange = useCallback((value: string) => {
    setFormValues((prev) => ({ ...prev, label: value }));
  }, []);

  const handleTypeChange = useCallback((value: NodeFormValues['type']) => {
    setFormValues((prev) => ({ ...prev, type: value }));
  }, []);

  const handleGroupChange = useCallback((value: string) => {
    setFormValues((prev) => ({ ...prev, group: value }));
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
  }, []);

  const handleConnectionRelationChange = useCallback(
    (key: string, relation: string) => {
      setLinks((prev) =>
        prev.map((link) => (makeLinkKey(link) === key ? { ...link, relation } : link))
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
    setGroups((prev) => prev.map((group) => (group.id === groupId ? updater(group) : group)));
  }, [setGroups]);

  const removeGroupById = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== groupId));
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
  }, [setGroups, setGroupLinks, groupPositionsRef, setConnectionDraft, setHoveredGroupLinkKey, setContextMenu]);

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
      setGroupForm({ mode, groupId });
      setSelectedGroupId(groupId);
      setActiveNodeId(null);
      setNodeForm(null);
      setConnectionForm(null);
      setContextMenu(null);
      setPanelGeometry((prev) => clampPanelGeometry(prev));
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
      setPanelGeometry,
      clampPanelGeometry,
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
      openGroupEditor(group.id);
    },
    [openGroupEditor]
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
    onNodeDoubleClick: openEditNodeForm,
    onNodeAuxClick: handleNodeAuxClick,
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
      setFormValues({
        label: overrides?.label ?? 'New Node',
        type: overrides?.type ?? 'vm',
        group: overrides?.group ?? '',
      });
      setNodeForm({
        mode: 'create',
        position,
      });
      handleContextMenuDismiss();
      setConnectionForm(null);
      setPanelExpanded(false);
      setSelectedGroupId(null);
      setHoveredGroupId(null);
      setGroupForm(null);
      setPanelGeometry((prev) =>
        clampPanelGeometry({
          ...prev,
          width: 360,
          height: 460,
        })
      );
    },
    [clampPanelGeometry, handleContextMenuDismiss]
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
      };
      setGroups((prev) => [...prev, nextGroup]);
      setSelectedGroupId(id);
      setHoveredGroupId(null);
      setGroupFormValues({ title: nextGroup.title, type: groupType });
      setGroupForm({ mode: 'create', groupId: id });
      setNodeForm(null);
      setConnectionForm(null);
      setContextMenu(null);
      setPanelGeometry((prev) => clampPanelGeometry(prev));
    },
    [getGraphCenterPosition, setGroups, clampPanelGeometry, setPanelGeometry]
  );

  const handleGroupTitleChange = useCallback((value: string) => {
    setGroupFormValues((prev) => ({ ...prev, title: value }));
  }, []);

  const handleGroupTypeChange = useCallback((value: GroupType) => {
    setGroupFormValues((prev) => ({ ...prev, type: value }));
  }, []);

  const connectionEditorSelection = useMemo(() => {
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
      setPanelExpanded(false);
      setPanelGeometry((prev) => clampPanelGeometry(prev));
    },
    [
      links,
      groupLinks,
      handleContextMenuDismiss,
      clampPanelGeometry,
      setPanelGeometry,
      setNodeForm,
      setGroupForm,
    ]
  );

  const handleConnectionFormRelationChange = useCallback((value: string) => {
    setConnectionForm((current) => (current ? { ...current, relation: value } : current));
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConnectionDraft(null);
        if (connectionForm) {
          setConnectionForm(null);
          return;
        }
        if (nodeForm) {
          setNodeForm(null);
          return;
        }
      if (contextMenu) {
        handleContextMenuDismiss();
        return;
      }
      setActiveNodeId(null);
      setHoveredNodeId(null);
      setHoveredEdgeKey(null);
      setHoveredGroupLinkKey(null);
    }

    if (connectionForm) {
      if (event.key === 'Delete' && connectionEditorSelection) {
        event.preventDefault();
        if (connectionForm.kind === 'node') {
          removeConnectionByKey(connectionForm.linkKey);
        } else {
          removeGroupConnectionByKey(connectionForm.linkKey);
        }
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        handleConnectionFormSubmit();
          return;
        }
        return;
      }

      if (nodeForm) {
        return;
      }

      if (event.key === 'Delete' && activeNodeId) {
        event.preventDefault();
        removeNodeById(activeNodeId);
      }

      if ((event.key === 'd' || event.key === 'D') && event.ctrlKey && activeNodeId) {
        event.preventDefault();
        const original = nodes.find((node) => node.id === activeNodeId);
        if (!original) {
          return;
        }
        const originalPosition = nodePositionsRef.current[activeNodeId] ?? { x: 0, y: 0 };
        const newId = createNodeId();
        const newPosition = { x: originalPosition.x + 40, y: originalPosition.y + 40 };
        nodePositionsRef.current[newId] = newPosition;
        setNodes((prev) => [
          ...prev,
          {
            ...original,
            id: newId,
            label: original.label ? `${original.label} Copy` : 'Node Copy',
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeNodeId,
    connectionDraft,
    connectionEditorSelection,
    connectionForm,
    contextMenu,
    handleContextMenuDismiss,
    handleConnectionFormSubmit,
    nodeForm,
    nodes,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    removeNodeById,
  ]);

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

  const handleNodeFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!nodeForm) {
        return;
      }

      const label = formValues.label.trim() || 'Untitled Node';
      const group = formValues.group.trim();

      if (nodeForm.mode === 'create') {
        const newId = createNodeId();
        nodePositionsRef.current[newId] = { ...nodeForm.position };
        setNodes((prev) => [
          ...prev,
          {
            id: newId,
            label,
            type: formValues.type,
            group,
          },
        ]);
        setActiveNodeId(newId);
        setHoveredNodeId(newId);
        setHoveredEdgeKey(null);
      } else if (nodeForm.mode === 'edit' && nodeForm.nodeId) {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === nodeForm.nodeId
              ? {
                  ...node,
                  label,
                  type: formValues.type,
                  group,
                }
              : node
          )
        );
      }

      setNodeForm(null);
    },
    [formValues, nodeForm]
  );

  const handleNodeFormClose = useCallback(() => {
    setNodeForm(null);
  }, []);

  const handleGroupFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!groupForm) {
        return;
      }
      const title = groupFormValues.title.trim() || 'Untitled Group';
      updateGroupById(groupForm.groupId, (group) => ({
        ...group,
        title,
        type: groupFormValues.type,
      }));
      setGroupForm(null);
    },
    [groupForm, groupFormValues, updateGroupById]
  );

  const handleGroupFormClose = useCallback(() => {
    setGroupForm(null);
  }, []);

  const handleGroupDelete = useCallback(() => {
    if (!groupForm) {
      return;
    }
    removeGroupById(groupForm.groupId);
  }, [groupForm, removeGroupById]);

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
    setWelcomeDismissed(true);
  }, []);

  const contextMenuItems = useMemo(() => {
    if (!contextMenu) {
      return [];
    }
    if (contextMenu.kind === 'canvas') {
      return [
        {
          id: 'add-node',
          label: 'Add node here',
          icon: <PlusIcon />,
          onSelect: handleContextMenuAddNode,
        },
      ];
    }

    if (contextMenu.kind === 'connection') {
      return [
        {
          id: 'edit-connection',
          label: 'Edit connection',
          icon: <EditIcon />,
          onSelect: () => openConnectionEditorByKey(contextMenu.edgeKey, 'node'),
        },
        {
          id: 'delete-connection',
          label: 'Delete connection',
          icon: <TrashIcon />,
          tone: 'danger' as const,
          onSelect: () => removeConnectionByKey(contextMenu.edgeKey),
        },
      ];
    }

    if (contextMenu.kind === 'group-connection') {
      return [
        {
          id: 'edit-group-connection',
          label: 'Edit group link',
          icon: <EditIcon />,
          onSelect: () => openConnectionEditorByKey(contextMenu.linkKey, 'group'),
        },
        {
          id: 'delete-group-connection',
          label: 'Delete group link',
          icon: <TrashIcon />,
          tone: 'danger' as const,
          onSelect: () => removeGroupConnectionByKey(contextMenu.linkKey),
        },
      ];
    }

    if (contextMenu.kind === 'group') {
      return [
        {
          id: 'edit-group',
          label: 'Edit group',
          icon: <EditIcon />,
          onSelect: () => openGroupEditor(contextMenu.groupId),
        },
        {
          id: 'delete-group',
          label: 'Delete group',
          icon: <TrashIcon />,
          tone: 'danger' as const,
          onSelect: () => removeGroupById(contextMenu.groupId),
        },
      ];
    }

    return [
      {
        id: 'edit-node',
        label: 'Edit node',
        icon: <EditIcon />,
        onSelect: () => openNodeEditorById(contextMenu.nodeId),
      },
      {
        id: 'delete-node',
        label: 'Delete node',
        icon: <TrashIcon />,
        tone: 'danger' as const,
        onSelect: () => removeNodeById(contextMenu.nodeId),
      },
    ];
  }, [
    contextMenu,
    handleContextMenuAddNode,
    openConnectionEditorByKey,
    openNodeEditorById,
    removeConnectionByKey,
    removeGroupConnectionByKey,
    removeNodeById,
    openGroupEditor,
    removeGroupById,
  ]);

  const handlePanelMove = useCallback(
    (position: { x: number; y: number }) => {
      setPanelGeometry((prev) => clampPanelGeometry({ ...prev, ...position }));
    },
    [clampPanelGeometry]
  );

  const handlePanelResize = useCallback(
    (geometry: { x: number; y: number; width: number; height: number }) => {
      setPanelGeometry(() =>
        clampPanelGeometry({
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
        })
      );
    },
    [clampPanelGeometry]
  );

  const handlePanelToggleExpand = useCallback(() => {
    setPanelExpanded((prev) => {
      const next = !prev;
      setPanelGeometry((current) =>
        clampPanelGeometry({
          ...current,
          width: next ? 480 : 360,
          height: next ? 560 : 460,
        })
      );
      return next;
    });
  }, [clampPanelGeometry]);

  const showWelcome = !welcomeDismissed && nodes.length === 0 && groups.length === 0;

  return (
    <div className="app">
      <Topbar activeTab={activeTab} onSelectTab={setActiveTab} />
      <GalxiSidebar
        onCreateNode={handleSidebarCreateNode}
        onCreateGroup={handleSidebarCreateGroup}
        onOpenTheme={handleThemeUtilities}
        onOpenSettings={handleSettingsUtilities}
      />

      <main className="canvas-shell">
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
      </main>

      {nodeForm && (
        <NodeEditorPanel
          mode={nodeForm.mode}
          values={formValues}
          nodeType={nodeFormType}
          onLabelChange={handleLabelChange}
          onTypeChange={handleTypeChange}
          onGroupChange={handleGroupChange}
          onClose={handleNodeFormClose}
          onSubmit={handleNodeFormSubmit}
          onDeleteNode={() => {
            if (nodeForm.mode === 'edit') {
              removeNodeById(nodeForm.nodeId);
            }
          }}
          nodeTypeOptions={nodeTypeOptions}
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
        />
      )}

      {utilityToast && (
        <div className="utility-toast" role="status">
          {utilityToast.message}
        </div>
      )}
    </div>
  );
};

export default App;






