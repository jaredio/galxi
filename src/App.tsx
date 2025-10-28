import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { ZoomTransform } from 'd3';
import * as d3 from 'd3';

import './App.css';

import { ContextMenu } from './components/ContextMenu';
import { EmptyState } from './components/EmptyState';
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
} from './constants/graph';
import { nodeTypeOptions } from './constants/nodeOptions';
import type { TabId } from './constants/tabs';
import { accent, applyTheme, baseTheme, edgeBase, textPrimary, textSecondary } from './constants/theme';
import { networkData } from './data/network';
import { useForceGraph } from './hooks/useForceGraph';
import { linkTouchesNode, makeEdgeKey, makeLinkKey, resolveAxis, resolveId, shortenSegment } from './lib/graph-utils';
import type {
  NetworkLink,
  NetworkNode,
  NodePositionMap,
  NodeType,
  SimulationLink,
  SimulationNode,
} from './types/graph';

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

type ContextMenuState = CanvasContextMenuState | NodeContextMenuState;

type NodeFormState =
  | {
      mode: 'create';
      position: { x: number; y: number };
    }
  | {
      mode: 'edit';
      nodeId: string;
    };

const createNodeId = () =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `node-${Date.now()}`;

const App = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomTransformRef = useRef<ZoomTransform>(d3.zoomIdentity);
  const nodePositionsRef = useRef<NodePositionMap>({});
  const panelViewportRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [nodes, setNodes] = useState<NetworkNode[]>(() => networkData.nodes.map((node) => ({ ...node })));
  const [links, setLinks] = useState<NetworkLink[]>(() => networkData.links.map((link) => ({ ...link })));
  const [activeTab, setActiveTab] = useState<TabId>('canvas');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [nodeForm, setNodeForm] = useState<NodeFormState | null>(null);
  const [formValues, setFormValues] = useState<NodeFormValues>({
    label: '',
    type: 'vm',
    group: '',
  });
  const [panelGeometry, setPanelGeometry] = useState<{ x: number; y: number; width: number; height: number }>(() => ({
    x: 72,
    y: 96,
    width: 360,
    height: 460,
  }));
  const [panelExpanded, setPanelExpanded] = useState(false);

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

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const handleEdgeHover = useCallback((edgeKey: string | null) => {
    setHoveredEdgeKey(edgeKey);
  }, []);

  const handleCanvasBackgroundClick = useCallback(() => {
    setActiveNodeId(null);
    setHoveredEdgeKey(null);
    setContextMenu(null);
  }, []);

  const handleNodeClick = useCallback((node: SimulationNode) => {
    setActiveNodeId(node.id);
  }, []);

  const handleNodeContextMenu = useCallback((event: MouseEvent, node: SimulationNode) => {
    setActiveNodeId(node.id);
    setHoveredNodeId(node.id);
    setContextMenu({
      kind: 'node',
      screenX: event.clientX,
      screenY: event.clientY,
      nodeId: node.id,
    });
  }, []);

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
      setActiveNodeId(nodeId);
      setHoveredNodeId(nodeId);
      setContextMenu(null);
      setPanelGeometry((prev) => clampPanelGeometry(prev));
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
    setContextMenu(null);
  }, []);

  const handleConnectionRelationChange = useCallback((key: string, relation: string) => {
    setLinks((prev) =>
      prev.map((link) => (makeLinkKey(link) === key ? { ...link, relation } : link))
    );
  }, []);

  const handleConnectionRemove = useCallback((key: string) => {
    setLinks((prev) => prev.filter((link) => makeLinkKey(link) !== key));
    setHoveredEdgeKey((current) => (current === key ? null : current));
  }, []);

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
    nodePositionsRef,
    zoomTransformRef,
    onNodeHover: handleNodeHover,
    onNodeClick: handleNodeClick,
    onNodeDoubleClick: openEditNodeForm,
    onNodeContextMenu: handleNodeContextMenu,
    onEdgeHover: handleEdgeHover,
    onCanvasClick: handleCanvasBackgroundClick,
    onContextMenuDismiss: handleContextMenuDismiss,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (nodeForm) {
          setNodeForm(null);
          return;
        }
        if (contextMenu) {
          handleContextMenuDismiss();
        }
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
  }, [activeNodeId, contextMenu, handleContextMenuDismiss, nodeForm, nodes, removeNodeById]);

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

  const handleCanvasContextMenu = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      event.preventDefault();
      if (!svgRef.current) {
        return;
      }
      const position = getGraphCoordinates(event);
      setActiveNodeId(null);
      setHoveredNodeId(null);
      setHoveredEdgeKey(null);
      setContextMenu({
        kind: 'canvas',
        screenX: event.clientX,
        screenY: event.clientY,
        graphX: position.x,
        graphY: position.y,
      });
    },
    [getGraphCoordinates]
  );

  const openCreateNodeForm = useCallback(
    (position: { x: number; y: number }) => {
      setFormValues({
        label: 'New Node',
        type: 'vm',
        group: '',
      });
      setNodeForm({
        mode: 'create',
        position,
      });
      handleContextMenuDismiss();
      setPanelExpanded(false);
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
    const edgeHighlighted = (link: SimulationLink) =>
      linkTouchesNode(link, activeNodeId) || makeEdgeKey(link) === hoveredEdgeKey;

    const nodeRadiusFor = (nodeId: string) => {
      if (nodeId === activeNodeId) {
        return NODE_ACTIVE_RADIUS;
      }
      if (nodeId === hoveredNodeId) {
        return NODE_HOVER_RADIUS;
      }
      return NODE_BASE_RADIUS;
    };

    if (nodeSelectionRef.current) {
      nodeSelectionRef.current
        .classed('node--active', (datum) => datum.id === activeNodeId)
        .classed('node--hovered', (datum) => datum.id === hoveredNodeId);

      nodeSelectionRef.current
        .select<SVGImageElement>('image.node-icon')
        .attr('x', (datum) => -nodeRadiusFor(datum.id))
        .attr('y', (datum) => -nodeRadiusFor(datum.id))
        .attr('width', (datum) => nodeRadiusFor(datum.id) * 2)
        .attr('height', (datum) => nodeRadiusFor(datum.id) * 2)
        .attr('filter', (datum) =>
          datum.id === activeNodeId || datum.id === hoveredNodeId ? 'url(#node-active-glow)' : null
        );

      nodeSelectionRef.current
        .select<SVGTextElement>('text.node-label')
        .attr('y', (datum) => nodeRadiusFor(datum.id) + LABEL_OFFSET)
        .attr('fill', (datum) => (datum.id === activeNodeId ? textPrimary : textSecondary));
    }

    if (linkSelectionRef.current) {
      linkSelectionRef.current.each(function updateLinkVisuals(datum) {
        const sourceX = resolveAxis(datum.source, 'x');
        const sourceY = resolveAxis(datum.source, 'y');
        const targetX = resolveAxis(datum.target, 'x');
        const targetY = resolveAxis(datum.target, 'y');

        const sourceRadius = nodeRadiusFor(resolveId(datum.source));
        const targetRadius = nodeRadiusFor(resolveId(datum.target));

        const { sx, sy, tx, ty } = shortenSegment(
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourceRadius + LINK_SOURCE_PADDING,
          targetRadius + LINK_TARGET_PADDING
        );

        const isHighlighted = edgeHighlighted(datum);

        d3.select<SVGLineElement, SimulationLink>(this)
          .attr('x1', sx)
          .attr('y1', sy)
          .attr('x2', tx)
          .attr('y2', ty)
          .attr('stroke', isHighlighted ? accent : edgeBase)
          .attr('stroke-width', isHighlighted ? 2.4 : 1.6)
          .attr('stroke-opacity', isHighlighted ? 0.95 : 0.35)
          .attr('marker-end', isHighlighted ? 'url(#arrowhead-accent)' : 'url(#arrowhead-base)');
      });
    }

    if (linkLabelSelectionRef.current) {
      linkLabelSelectionRef.current
        .attr('x', (datum) => {
          const sourceX = resolveAxis(datum.source, 'x');
          const targetX = resolveAxis(datum.target, 'x');
          return (sourceX + targetX) / 2;
        })
        .attr('y', (datum) => {
          const sourceY = resolveAxis(datum.source, 'y');
          const targetY = resolveAxis(datum.target, 'y');
          return (sourceY + targetY) / 2;
        })
        .attr('fill', (datum) => (edgeHighlighted(datum) ? accent : textSecondary))
        .attr('font-weight', (datum) => (edgeHighlighted(datum) ? 600 : 500))
        .attr('opacity', (datum) => (edgeHighlighted(datum) ? 1 : 0.35));
    }
  }, [activeNodeId, hoveredNodeId, hoveredEdgeKey, linkLabelSelectionRef, linkSelectionRef, nodeSelectionRef, nodes, links]);

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
    openCreateNodeForm({ x: 0, y: 0 });
  }, [openCreateNodeForm]);

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
  }, [contextMenu, handleContextMenuAddNode, openNodeEditorById, removeNodeById]);

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

  return (
    <div className="app">
      <Topbar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="canvas-shell">
        <svg ref={svgRef} className="mindmap-canvas" onContextMenu={handleCanvasContextMenu} />

        {nodes.length === 0 && <EmptyState onCreateNode={handleEmptyStateCreate} />}

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
    </div>
  );
};

export default App;
