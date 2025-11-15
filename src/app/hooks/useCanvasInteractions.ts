import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, MouseEvent as ReactMouseEvent, MutableRefObject, SetStateAction } from 'react';
import type { ZoomTransform } from 'd3';
import * as d3 from 'd3';

import { useGraphOrchestration } from '../../hooks/useGraphOrchestration';
import { useForceGraph } from '../../hooks/useForceGraph';
import { makeEdgeKey } from '../../lib/graph-utils';
import type {
  ConnectionDraft,
  ConnectionFormState,
  ContextMenuState,
  GroupFormState,
  NodeFormState,
} from '../../types/appState';
import type {
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  NetworkLink,
  NetworkNode,
  NodePositionMap,
} from '../../types/graph';

type AttachFn<T> = (fn: Dispatch<SetStateAction<T>>) => void;

type UseCanvasInteractionsArgs = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
  groups: CanvasGroup[];
  setLinks: (updater: (prev: NetworkLink[]) => NetworkLink[]) => void;
  setGroupLinks: (updater: (prev: GroupLink[]) => GroupLink[]) => void;
  collapsePanel: () => void;
  setConnectionForm: Dispatch<SetStateAction<ConnectionFormState | null>>;
  setNodeForm: Dispatch<SetStateAction<NodeFormState | null>>;
  setGroupForm: Dispatch<SetStateAction<GroupFormState | null>>;
  showUtilityToast: (message: string) => void;
  openProfileWindow: (
    kind: 'node' | 'group',
    resourceId: string,
    options?: { startEditing?: boolean }
  ) => void;
  nodePositionsRef: MutableRefObject<NodePositionMap>;
  groupPositionsRef: MutableRefObject<GroupPositionMap>;
  lastSyncedConnectionRef: MutableRefObject<{
    kind: ConnectionFormState['kind'];
    key: string;
    relation: string;
  } | null>;
  assignNodeToGroupByPosition: (nodeId: string, position?: { x: number; y: number }) => void;
  publishLayoutChange: () => void;
  isCanvasView: boolean;
  handleGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  handleGroupResize: (
    groupId: string,
    geometry: { x: number; y: number; width: number; height: number }
  ) => void;
  attachActiveNodeId: AttachFn<string | null>;
  attachHoveredNodeId: AttachFn<string | null>;
  attachHoveredEdgeKey: AttachFn<string | null>;
  attachHoveredGroupLinkKey: AttachFn<string | null>;
  attachHoveredGroupId: AttachFn<string | null>;
  attachSelectedGroupId: AttachFn<string | null>;
  attachContextMenu: AttachFn<ContextMenuState | null>;
  attachConnectionDraft: AttachFn<ConnectionDraft | null>;
  attachContextMenuDismiss: (fn: () => void) => void;
};

export const useCanvasInteractions = ({
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
  showUtilityToast,
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
}: UseCanvasInteractionsArgs) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomTransformRef = useRef<ZoomTransform>(d3.zoomIdentity);

  const {
    state,
    actions,
  } = useGraphOrchestration({
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
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const wrapDispatch = <T>(
      action: (value: T) => void,
      getter: () => T
    ): Dispatch<SetStateAction<T>> => {
      return (next) => {
        const current = getter();
        const value = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
        action(value as T);
      };
    };

    attachActiveNodeId(wrapDispatch(actions.setActiveNodeId, () => stateRef.current.activeNodeId));
    attachHoveredNodeId(wrapDispatch(actions.setHoveredNodeId, () => stateRef.current.hoveredNodeId));
    attachHoveredEdgeKey(wrapDispatch(actions.setHoveredEdgeKey, () => stateRef.current.hoveredEdgeKey));
    attachHoveredGroupLinkKey(
      wrapDispatch(actions.setHoveredGroupLinkKey, () => stateRef.current.hoveredGroupLinkKey)
    );
    attachHoveredGroupId(
      wrapDispatch(actions.setHoveredGroupId, () => stateRef.current.hoveredGroupId)
    );
    attachSelectedGroupId(
      wrapDispatch(actions.setSelectedGroupId, () => stateRef.current.selectedGroupId)
    );
    attachContextMenu(wrapDispatch(actions.setContextMenu, () => stateRef.current.contextMenu));
    attachConnectionDraft(
      wrapDispatch(actions.setConnectionDraft, () => stateRef.current.connectionDraft)
    );
    attachContextMenuDismiss(actions.handleContextMenuDismiss);
  }, [
    actions.handleContextMenuDismiss,
    actions.setActiveNodeId,
    actions.setConnectionDraft,
    actions.setContextMenu,
    actions.setHoveredEdgeKey,
    actions.setHoveredGroupId,
    actions.setHoveredGroupLinkKey,
    actions.setHoveredNodeId,
    actions.setSelectedGroupId,
    attachActiveNodeId,
    attachConnectionDraft,
    attachContextMenu,
    attachContextMenuDismiss,
    attachHoveredEdgeKey,
    attachHoveredGroupId,
    attachHoveredGroupLinkKey,
    attachHoveredNodeId,
    attachSelectedGroupId,
  ]);

  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      actions.setHoveredNodeId(nodeId);
    },
    [actions]
  );

  const handleNodeDragEnd = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      assignNodeToGroupByPosition(nodeId, position);
    },
    [assignNodeToGroupByPosition]
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
    connectionDraft: state.connectionDraft,
    hoveredGroupLinkKey: state.hoveredGroupLinkKey,
    onNodeHover: handleNodeHover,
    onNodeClick: actions.handleNodeClick,
    onNodeDoubleClick: actions.handleNodeDoubleClick,
    onNodeAuxClick: actions.handleNodeAuxClick,
    onNodeDragEnd: handleNodeDragEnd,
    onNodeContextMenu: actions.handleNodeContextMenu,
    onEdgeHover: actions.handleEdgeHover,
    onLinkContextMenu: (event, link) => {
      event.preventDefault();
      const edgeKey = makeEdgeKey(link);
      actions.setConnectionDraft(null);
      actions.setActiveNodeId(null);
      actions.setHoveredGroupLinkKey(null);
      setConnectionForm(null);
      actions.setHoveredEdgeKey(edgeKey);
      actions.setContextMenu({
        kind: 'connection',
        screenX: event.clientX,
        screenY: event.clientY,
        edgeKey,
      });
    },
    onGroupLinkHover: actions.handleGroupLinkHover,
    onGroupLinkContextMenu: actions.handleGroupLinkContextMenu,
    onCanvasClick: actions.handleCanvasBackgroundClick,
    onContextMenuDismiss: actions.handleContextMenuDismiss,
    onGroupHover: actions.handleGroupHover,
    onGroupSelect: actions.handleGroupSelect,
    onGroupAuxClick: actions.handleGroupAuxClick,
    onGroupContextMenu: actions.handleGroupContextMenu,
    onGroupDoubleClick: actions.handleGroupDoubleClick,
    onGroupMove: handleGroupMove,
    onGroupResize: handleGroupResize,
    onLayoutChange: publishLayoutChange,
    selectedGroupId: state.selectedGroupId,
    hoveredGroupId: state.hoveredGroupId,
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
      if (state.connectionDraft) {
        actions.setConnectionDraft(null);
      }
      actions.setActiveNodeId(null);
      actions.setHoveredNodeId(null);
      actions.setHoveredEdgeKey(null);
      actions.setHoveredGroupLinkKey(null);
      actions.setContextMenu({
        kind: 'canvas',
        screenX: event.clientX,
        screenY: event.clientY,
        graphX: position.x,
        graphY: position.y,
      });
    },
    [actions, getGraphCoordinates, state.connectionDraft]
  );

  const handleCanvasMouseMove = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      actions.setConnectionDraft((prev) => {
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
    [actions, getGraphCoordinates]
  );

  const handleZoomIn = useCallback(() => {
    applyZoomScalar(1.25);
  }, [applyZoomScalar]);

  const handleZoomOut = useCallback(() => {
    applyZoomScalar(0.8);
  }, [applyZoomScalar]);

  const handleResetZoom = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

  return {
    state,
    actions,
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
  };
};

export type CanvasInteractionsApi = ReturnType<typeof useCanvasInteractions>;
