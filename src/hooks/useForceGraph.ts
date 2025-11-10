import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as d3 from 'd3';
import type { D3DragEvent, ZoomBehavior, ZoomTransform } from 'd3';
import {
  NODE_BASE_RADIUS,
  LINK_SOURCE_PADDING,
  LINK_TARGET_PADDING,
  LABEL_OFFSET,
  LINK_BASE_WIDTH,
} from '../constants/graph';
import { getGroupIcon } from '../constants/groupIcons';
import { getNodeIcon } from '../constants/nodeIcons';
import { accent, edgeBase, textSecondary } from '../constants/theme';
import { makeEdgeKey, makeGroupLinkKey, resolveAxis, shortenSegment } from '../lib/graph-utils';
import type {
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  NetworkLink,
  NetworkNode,
  NodePositionMap,
  SimulationLink,
  SimulationNode,
} from '../types/graph';
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
    }
  | null;
type GroupResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';
const GROUP_HEADER_HEIGHT = 32;
const GROUP_CORNER_RADIUS = 14;
const GROUP_HANDLE_SIZE = 12;
const GROUP_MIN_WIDTH = 200;
const GROUP_MIN_HEIGHT = 140;
const groupHandleDefinitions: Array<{ key: GroupResizeHandle; cursor: string }> = [
  { key: 'top-left', cursor: 'nwse-resize' },
  { key: 'top', cursor: 'ns-resize' },
  { key: 'top-right', cursor: 'nesw-resize' },
  { key: 'right', cursor: 'ew-resize' },
  { key: 'bottom-right', cursor: 'nwse-resize' },
  { key: 'bottom', cursor: 'ns-resize' },
  { key: 'bottom-left', cursor: 'nesw-resize' },
  { key: 'left', cursor: 'ew-resize' },
];
const clampDimension = (value: number, min: number) => Math.max(min, value);
const computeGroupResize = (
  handle: GroupResizeHandle,
  origin: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number
) => {
  let { x, y, width, height } = origin;
  const adjustWidth = (delta: number, anchor: 'left' | 'right') => {
    if (anchor === 'right') {
      width = clampDimension(origin.width + delta, GROUP_MIN_WIDTH);
    } else {
      const nextWidth = clampDimension(origin.width - delta, GROUP_MIN_WIDTH);
      x = origin.x + (origin.width - nextWidth);
      width = nextWidth;
    }
  };
  const adjustHeight = (delta: number, anchor: 'top' | 'bottom') => {
    if (anchor === 'bottom') {
      height = clampDimension(origin.height + delta, GROUP_MIN_HEIGHT);
    } else {
      const nextHeight = clampDimension(origin.height - delta, GROUP_MIN_HEIGHT);
      y = origin.y + (origin.height - nextHeight);
      height = nextHeight;
    }
  };
  switch (handle) {
    case 'top-left':
      adjustWidth(dx, 'left');
      adjustHeight(dy, 'top');
      break;
    case 'top':
      adjustHeight(dy, 'top');
      break;
    case 'top-right':
      adjustWidth(dx, 'right');
      adjustHeight(dy, 'top');
      break;
    case 'right':
      adjustWidth(dx, 'right');
      break;
    case 'bottom-right':
      adjustWidth(dx, 'right');
      adjustHeight(dy, 'bottom');
      break;
    case 'bottom':
      adjustHeight(dy, 'bottom');
      break;
    case 'bottom-left':
      adjustWidth(dx, 'left');
      adjustHeight(dy, 'bottom');
      break;
    case 'left':
      adjustWidth(dx, 'left');
      break;
    default:
      break;
  }
  return { x, y, width, height };
};
const computeHandlePosition = (handle: GroupResizeHandle, width: number, height: number) => {
  const half = GROUP_HANDLE_SIZE / 2;
  switch (handle) {
    case 'top-left':
      return { x: -half, y: -half };
    case 'top':
      return { x: width / 2 - half, y: -half };
    case 'top-right':
      return { x: width - half, y: -half };
    case 'right':
      return { x: width - half, y: height / 2 - half };
    case 'bottom-right':
      return { x: width - half, y: height - half };
    case 'bottom':
      return { x: width / 2 - half, y: height - half };
    case 'bottom-left':
      return { x: -half, y: height - half };
    case 'left':
      return { x: -half, y: height / 2 - half };
    default:
      return { x: -half, y: -half };
  }
};
type ForceGraphCallbacks = {
  onNodeHover: (nodeId: string | null) => void;
  onNodeClick: (node: SimulationNode) => void;
  onNodeDoubleClick: (node: SimulationNode) => void;
  onNodeAuxClick: (event: MouseEvent, node: SimulationNode) => void;
  onNodeDragEnd: (nodeId: string, position: { x: number; y: number }) => void;
  onEdgeHover: (edgeKey: string | null) => void;
  onLinkContextMenu: (event: MouseEvent, link: SimulationLink) => void;
  onCanvasClick: () => void;
  onContextMenuDismiss: () => void;
  onNodeContextMenu: (event: MouseEvent, node: SimulationNode) => void;
  onGroupHover: (groupId: string | null) => void;
  onGroupLinkHover: (linkKey: string | null) => void;
  onGroupLinkContextMenu: (event: MouseEvent, link: GroupLink) => void;
  onGroupSelect: (groupId: string | null) => void;
  onGroupAuxClick: (event: MouseEvent, group: CanvasGroup) => void;
  onGroupContextMenu: (event: MouseEvent, group: CanvasGroup) => void;
  onGroupDoubleClick: (group: CanvasGroup) => void;
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  onGroupResize: (
    groupId: string,
    geometry: { x: number; y: number; width: number; height: number }
  ) => void;
};
type UseForceGraphArgs = ForceGraphCallbacks & {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  nodes: NetworkNode[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
  groups: CanvasGroup[];
  nodePositionsRef: MutableRefObject<NodePositionMap>;
  groupPositionsRef: MutableRefObject<GroupPositionMap>;
  zoomTransformRef: MutableRefObject<ZoomTransform>;
  connectionDraft: ConnectionDraft;
  hoveredGroupLinkKey: string | null;
  selectedGroupId: string | null;
  hoveredGroupId: string | null;
  isActive: boolean;
};
const makeSimulationLink = (link: NetworkLink): SimulationLink => ({ ...link });
export const useForceGraph = ({
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
  onNodeHover,
  onNodeClick,
  onNodeDoubleClick,
  onNodeAuxClick,
  onNodeDragEnd,
  onEdgeHover,
  onLinkContextMenu,
  onCanvasClick,
  onContextMenuDismiss,
  onNodeContextMenu,
  onGroupHover,
  onGroupLinkHover,
  onGroupLinkContextMenu,
  onGroupSelect,
  onGroupAuxClick,
  onGroupContextMenu,
  onGroupDoubleClick,
  onGroupMove,
  onGroupResize,
  selectedGroupId,
  hoveredGroupId,
  isActive,
}: UseForceGraphArgs) => {
  const canvasHandlersRef = useRef({
    onCanvasClick,
    onContextMenuDismiss,
  });
  const interactionHandlersRef = useRef<ForceGraphCallbacks>({
    onNodeHover,
    onNodeClick,
    onNodeDoubleClick,
    onNodeAuxClick,
    onNodeDragEnd,
    onEdgeHover,
    onLinkContextMenu,
    onCanvasClick,
    onContextMenuDismiss,
    onNodeContextMenu,
    onGroupHover,
    onGroupLinkHover,
    onGroupLinkContextMenu,
    onGroupSelect,
    onGroupAuxClick,
    onGroupContextMenu,
    onGroupDoubleClick,
    onGroupMove,
    onGroupResize,
  });
  type HandlerArgs<K extends keyof ForceGraphCallbacks> = ForceGraphCallbacks[K] extends (
    ...handlerArgs: infer P
  ) => unknown
    ? P
    : never;
  const invoke = <K extends keyof ForceGraphCallbacks>(key: K, ...args: HandlerArgs<K>) => {
    const handler = interactionHandlersRef.current[key] as (...handlerArgs: HandlerArgs<K>) => unknown;
    handler(...args);
  };
  const svgSelectionRef = useRef<d3.Selection<SVGSVGElement, any, any, any> | null>(null);
  const containerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const groupLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const groupLinkLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const groupLinkHitLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const groupLinkLabelLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const nodeLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const linkHitLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const linkLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const linkLabelLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const draftLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const draftLineRef = useRef<d3.Selection<SVGLineElement, any, any, any> | null>(null);
  const groupLinkSelectionRef = useRef<d3.Selection<SVGLineElement, GroupLink, SVGGElement, unknown> | null>(null);
  const groupLinkHitSelectionRef = useRef<d3.Selection<SVGLineElement, GroupLink, SVGGElement, unknown> | null>(null);
  const groupLinkLabelSelectionRef = useRef<d3.Selection<SVGTextElement, GroupLink, SVGGElement, unknown> | null>(null);
  const groupSelectionRef = useRef<
    d3.Selection<SVGGElement, CanvasGroup, SVGGElement, unknown> | null
  >(null);
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown> | null>(null);
  const linkHitSelectionRef = useRef<d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown> | null>(null);
  const linkLabelSelectionRef = useRef<d3.Selection<SVGTextElement, SimulationLink, SVGGElement, unknown> | null>(
    null
  );
  const groupDragStateRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const groupResizeStateRef = useRef<
    | {
        id: string;
        handle: GroupResizeHandle;
        origin: { x: number; y: number; width: number; height: number };
        dx: number;
        dy: number;
        next: { x: number; y: number; width: number; height: number };
      }
    | null
  >(null);
  const zoomBehaviourRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const viewDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const nodeDragStateRef = useRef<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const groupGeometryRef = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const positionFrameRef = useRef<number | null>(null);
  useEffect(() => {
    canvasHandlersRef.current = {
      onCanvasClick,
      onContextMenuDismiss,
    };
  }, [onCanvasClick, onContextMenuDismiss]);
  useEffect(() => {
    interactionHandlersRef.current = {
      onNodeHover,
      onNodeClick,
      onNodeDoubleClick,
      onNodeAuxClick,
      onNodeDragEnd,
      onEdgeHover,
      onLinkContextMenu,
      onCanvasClick,
      onContextMenuDismiss,
      onNodeContextMenu,
      onGroupHover,
      onGroupLinkHover,
      onGroupLinkContextMenu,
      onGroupSelect,
      onGroupAuxClick,
      onGroupContextMenu,
      onGroupDoubleClick,
      onGroupMove,
      onGroupResize,
    };
  }, [
    onNodeHover,
    onNodeClick,
    onNodeDoubleClick,
    onNodeAuxClick,
    onNodeDragEnd,
    onEdgeHover,
    onLinkContextMenu,
    onCanvasClick,
    onContextMenuDismiss,
    onNodeContextMenu,
    onGroupHover,
    onGroupLinkHover,
    onGroupLinkContextMenu,
    onGroupSelect,
    onGroupAuxClick,
    onGroupContextMenu,
    onGroupDoubleClick,
    onGroupMove,
    onGroupResize,
  ]);
  const computeRectEdgeIntersection = (
    centerX: number,
    centerY: number,
    halfWidth: number,
    halfHeight: number,
    dx: number,
    dy: number
  ) => {
    const epsilon = 1e-6;
    const safeHalfWidth = Math.max(halfWidth, epsilon);
    const safeHalfHeight = Math.max(halfHeight, epsilon);
    const scale = Math.max(Math.abs(dx) / safeHalfWidth, Math.abs(dy) / safeHalfHeight);
    if (!Number.isFinite(scale) || scale <= epsilon) {
      return { x: centerX, y: centerY };
    }
    return {
      x: centerX + dx / scale,
      y: centerY + dy / scale,
    };
  };
  const resolveGroupLinkSegment = (
    source: { x: number; y: number; width: number; height: number },
    target: { x: number; y: number; width: number; height: number }
  ) => {
    const sourceCenterX = source.x + source.width / 2;
    const sourceCenterY = source.y + source.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;
    const almostZero = Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6;
    if (almostZero) {
      return {
        sx: sourceCenterX,
        sy: sourceCenterY,
        tx: targetCenterX,
        ty: targetCenterY,
      };
    }
    const sourceEndpoint = computeRectEdgeIntersection(
      sourceCenterX,
      sourceCenterY,
      source.width / 2,
      source.height / 2,
      dx,
      dy
    );
    const targetEndpoint = computeRectEdgeIntersection(
      targetCenterX,
      targetCenterY,
      target.width / 2,
      target.height / 2,
      -dx,
      -dy
    );
    return {
      sx: sourceEndpoint.x,
      sy: sourceEndpoint.y,
      tx: targetEndpoint.x,
      ty: targetEndpoint.y,
    };
  };
  const updateGroupLinkPositions = () => {
    const geometry = groupGeometryRef.current;
    const positionLineSelection = (
      selection: d3.Selection<SVGLineElement, GroupLink, SVGGElement, unknown> | null
    ) => {
      if (!selection) {
        return;
      }
      selection.each(function positionLink(datum) {
        const source = geometry[datum.sourceGroupId];
        const target = geometry[datum.targetGroupId];
        const line = d3.select<SVGLineElement, GroupLink>(this);
        if (!source || !target) {
          line.attr('visibility', 'hidden');
          return;
        }
        const { sx, sy, tx, ty } = resolveGroupLinkSegment(source, target);
        line
          .attr('visibility', 'visible')
          .attr('x1', sx)
          .attr('y1', sy)
          .attr('x2', tx)
          .attr('y2', ty);
      });
    };
    const positionLabelSelection = (
      selection: d3.Selection<SVGTextElement, GroupLink, SVGGElement, unknown> | null
    ) => {
      if (!selection) {
        return;
      }
      selection.each(function positionLabel(datum) {
        const source = geometry[datum.sourceGroupId];
        const target = geometry[datum.targetGroupId];
        const label = d3.select<SVGTextElement, GroupLink>(this);
        if (!source || !target) {
          label.attr('visibility', 'hidden');
          return;
        }
        const { sx, sy, tx, ty } = resolveGroupLinkSegment(source, target);
        label
          .attr('visibility', datum.relation ? 'visible' : 'hidden')
          .attr('x', (sx + tx) / 2)
          .attr('y', (sy + ty) / 2 - 6);
      });
    };
    positionLineSelection(groupLinkSelectionRef.current);
    positionLineSelection(groupLinkHitSelectionRef.current);
    positionLabelSelection(groupLinkLabelSelectionRef.current);
  };
  const applyGroupLayout = (
    group: d3.Selection<SVGGElement, CanvasGroup, any, any>,
    datum: CanvasGroup
  ) => {
    const iconSize = 16;
    group
      .attr('transform', `translate(${datum.x},${datum.y})`)
      .classed('canvas-group--virtual-network', datum.type === 'virtualNetwork')
      .classed('canvas-group--subnet', datum.type === 'subnet')
      .classed('canvas-group--logical', datum.type === 'logicalGroup');
    group
      .select<SVGRectElement>('rect.canvas-group__frame')
      .attr('width', datum.width)
      .attr('height', datum.height)
      .attr('rx', GROUP_CORNER_RADIUS)
      .attr('ry', GROUP_CORNER_RADIUS);
    group
      .select<SVGRectElement>('rect.canvas-group__header')
      .attr('width', datum.width)
      .attr('height', GROUP_HEADER_HEIGHT)
      .attr('rx', GROUP_CORNER_RADIUS)
      .attr('ry', GROUP_CORNER_RADIUS);
    group
      .select<SVGImageElement>('image.canvas-group__icon')
      .attr('href', getGroupIcon(datum.type))
      .attr('width', iconSize)
      .attr('height', iconSize)
      .attr('x', 12)
      .attr('y', (GROUP_HEADER_HEIGHT - iconSize) / 2);
    group
      .select<SVGTextElement>('text.canvas-group__title')
      .attr('x', 12 + iconSize + 8)
      .attr('y', GROUP_HEADER_HEIGHT / 2)
      .text(datum.title);
    group
      .selectAll<SVGRectElement, { key: GroupResizeHandle; cursor: string }>(
        'g.canvas-group__handles rect.canvas-group__handle'
      )
      .attr('x', (handle: { key: GroupResizeHandle; cursor: string }) =>
        computeHandlePosition(handle.key, datum.width, datum.height).x
      )
      .attr('y', (handle: { key: GroupResizeHandle; cursor: string }) =>
        computeHandlePosition(handle.key, datum.width, datum.height).y
      );
    groupGeometryRef.current[datum.id] = {
      x: datum.x,
      y: datum.y,
      width: datum.width,
      height: datum.height,
    };
    groupPositionsRef.current[datum.id] = {
      x: datum.x + datum.width / 2,
      y: datum.y + datum.height / 2,
    };
    updateGroupLinkPositions();
  };
  useEffect(() => {
    canvasHandlersRef.current = { onCanvasClick, onContextMenuDismiss };
  }, [onCanvasClick, onContextMenuDismiss]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }
    if (containerRef.current) {
      const width = svgElement.clientWidth || window.innerWidth;
      const height = svgElement.clientHeight || window.innerHeight;
      viewDimensionsRef.current = { width, height };
      d3.select(svgElement).attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`);
      return;
    }
    const svg = d3.select(svgElement);
    svgSelectionRef.current = svg;
    svg.attr('data-theme', 'galxi').style('touch-action', 'none');
    const updateViewBox = () => {
      const width = svgElement.clientWidth || window.innerWidth;
      const height = svgElement.clientHeight || window.innerHeight;
      viewDimensionsRef.current = { width, height };
      svg.attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`);
    };
    updateViewBox();
    const container = svg.append('g').attr('class', 'graph-root');
    containerRef.current = container;
    const groupLayer = container.append('g').attr('class', 'group-layer');
    const groupLinkLayer = container
      .append('g')
      .attr('class', 'group-link-layer')
      .style('pointer-events', 'none');
    const groupLinkHitLayer = container.append('g').attr('class', 'group-link-hit-layer');
    const groupLinkLabelLayer = container
      .append('g')
      .attr('class', 'group-link-label-layer')
      .style('pointer-events', 'none');
    const linkHitLayer = container.append('g').attr('class', 'link-hit-layer');
    const linkLayer = container.append('g').attr('class', 'link-layer');
    const linkLabelLayer = container.append('g').attr('class', 'link-label-layer');
    const nodeLayer = container.append('g').attr('class', 'node-layer');
    const draftLayer = container.append('g').attr('class', 'draft-layer').style('pointer-events', 'none');
    groupLayerRef.current = groupLayer;
    groupLinkLayerRef.current = groupLinkLayer;
    groupLinkHitLayerRef.current = groupLinkHitLayer;
    groupLinkLabelLayerRef.current = groupLinkLabelLayer;
    linkHitLayerRef.current = linkHitLayer;
    linkLayerRef.current = linkLayer;
    linkLabelLayerRef.current = linkLabelLayer;
    nodeLayerRef.current = nodeLayer;
    draftLayerRef.current = draftLayer;
    const draftLine = draftLayer
      .append('line')
      .attr('class', 'draft-link')
      .attr('stroke', accent)
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '6 8')
      .attr('stroke-dashoffset', 0)
      .attr('marker-end', 'url(#arrowhead-accent)')
      .attr('visibility', 'hidden');
    draftLineRef.current = draftLine;
    const defs = svg.append('defs');
    const markerData = [
      { id: 'arrowhead-base', color: edgeBase },
      { id: 'arrowhead-accent', color: accent },
    ];
    const ARROW_HEAD_LENGTH = 10;
    const ARROW_HEAD_RADIUS = 5;
    const markers = defs
      .selectAll<SVGMarkerElement, { id: string; color: string }>('marker')
      .data(markerData)
      .join('marker')
      .attr('id', (datum) => datum.id)
      .attr('viewBox', `-${ARROW_HEAD_LENGTH} ${-ARROW_HEAD_RADIUS} ${ARROW_HEAD_LENGTH} ${ARROW_HEAD_RADIUS * 2}`)
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', ARROW_HEAD_LENGTH)
      .attr('markerHeight', ARROW_HEAD_RADIUS * 2)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('orient', 'auto');
    markers
      .selectAll<SVGPathElement, { id: string; color: string }>('path')
      .data((datum) => [datum])
      .join('path')
      .attr('d', `M0,0 L-${ARROW_HEAD_LENGTH},${ARROW_HEAD_RADIUS} L-${ARROW_HEAD_LENGTH},-${ARROW_HEAD_RADIUS} Z`)
      .attr('fill', (datum) => datum.color);
    const glow = defs
      .append('filter')
      .attr('id', 'node-active-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', 6).attr('result', 'coloredBlur');
    const glowMerge = glow.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2.5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
        zoomTransformRef.current = event.transform;
      });
    zoomBehaviourRef.current = zoom;
    svg.call(zoom).call(zoom.transform, zoomTransformRef.current);
    const handleSvgClick = (event: MouseEvent) => {
      if (event.target === svgElement) {
        const { onCanvasClick: handleCanvasClick, onContextMenuDismiss: handleDismiss } =
          canvasHandlersRef.current;
        handleDismiss();
        handleCanvasClick();
      }
    };
    svg.on('click', handleSvgClick as unknown as null);
    const handleResize = () => updateViewBox();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      svg.on('.zoom', null);
      svg.on('click', null);
      svg.selectAll('*').remove();
      groupLayerRef.current = null;
      groupLinkLayerRef.current = null;
      groupLinkHitLayerRef.current = null;
      groupLinkLabelLayerRef.current = null;
      nodeSelectionRef.current = null;
      linkSelectionRef.current = null;
      linkHitSelectionRef.current = null;
      linkLabelSelectionRef.current = null;
      groupLinkSelectionRef.current = null;
      groupLinkHitSelectionRef.current = null;
      groupLinkLabelSelectionRef.current = null;
      containerRef.current = null;
      nodeLayerRef.current = null;
      linkHitLayerRef.current = null;
      linkLayerRef.current = null;
      linkLabelLayerRef.current = null;
      draftLayerRef.current = null;
      draftLineRef.current = null;
      svgSelectionRef.current = null;
    };
  }, [isActive]);
  useEffect(() => {
    const nodeLayer = nodeLayerRef.current;
    const linkHitLayer = linkHitLayerRef.current;
    const linkLayer = linkLayerRef.current;
    const linkLabelLayer = linkLabelLayerRef.current;
    const svgElement = svgRef.current;
    if (!nodeLayer || !linkHitLayer || !linkLayer || !linkLabelLayer || !svgElement) {
      return;
    }
    const { width, height } = viewDimensionsRef.current;
    const viewWidth = width || svgElement.clientWidth || window.innerWidth;
    const viewHeight = height || svgElement.clientHeight || window.innerHeight;
    const simNodes: SimulationNode[] = nodes.map((node) => {
      if (!nodePositionsRef.current[node.id]) {
        nodePositionsRef.current[node.id] = {
          x: (Math.random() - 0.5) * viewWidth * 0.6,
          y: (Math.random() - 0.5) * viewHeight * 0.6,
        };
      }
      const { x, y } = nodePositionsRef.current[node.id];
      return {
        ...node,
        x,
        y,
        fx: x,
        fy: y,
      };
    });
    const simLinks = links.map(makeSimulationLink);
    const groupLayer = groupLayerRef.current;
    if (!groupLayer) {
      return;
    }
    simNodes.forEach((node) => {
      const nextX = node.x ?? 0;
      const nextY = node.y ?? 0;
      node.fx = nextX;
      node.fy = nextY;
    });
    const groupDragBehaviour = d3
      .drag<SVGGElement, CanvasGroup>()
      .on('start', (event, datum) => {
        event.sourceEvent?.stopPropagation();
        groupDragStateRef.current = { id: datum.id, x: datum.x, y: datum.y };
        invoke('onGroupSelect', datum.id);
      })
      .on('drag', function (event) {
        const dragState = groupDragStateRef.current;
        if (!dragState) {
          return;
        }
        dragState.x += event.dx;
        dragState.y += event.dy;
        const group = d3.select<SVGGElement, CanvasGroup>(this);
        const datum = group.datum();
        datum.x = dragState.x;
        datum.y = dragState.y;
        applyGroupLayout(group, datum);
      })
      .on('end', () => {
        const dragState = groupDragStateRef.current;
        if (dragState) {
          invoke('onGroupMove', dragState.id, { x: dragState.x, y: dragState.y });
        }
        groupDragStateRef.current = null;
      });
    const groupResizeBehaviour = d3
      .drag<SVGRectElement, { key: GroupResizeHandle; cursor: string }>()
      .on('start', function (event, handle) {
        event.sourceEvent?.stopPropagation();
        const parentGroup = this.parentNode?.parentNode as SVGGElement | null;
        if (!parentGroup) {
          return;
        }
        const datum = d3.select<SVGGElement, CanvasGroup>(parentGroup).datum();
        groupResizeStateRef.current = {
          id: datum.id,
          handle: handle.key,
          origin: { x: datum.x, y: datum.y, width: datum.width, height: datum.height },
          dx: 0,
          dy: 0,
          next: { x: datum.x, y: datum.y, width: datum.width, height: datum.height },
        };
        invoke('onGroupSelect', datum.id);
      })
      .on('drag', function (event) {
        const resizeState = groupResizeStateRef.current;
        if (!resizeState) {
          return;
        }
        resizeState.dx += event.dx;
        resizeState.dy += event.dy;
        const next = computeGroupResize(resizeState.handle, resizeState.origin, resizeState.dx, resizeState.dy);
        resizeState.next = next;
        const parentGroup = this.parentNode?.parentNode as SVGGElement | null;
        if (!parentGroup) {
          return;
        }
        const group = d3.select<SVGGElement, CanvasGroup>(parentGroup);
        const datum = group.datum();
        datum.x = next.x;
        datum.y = next.y;
        datum.width = next.width;
        datum.height = next.height;
        applyGroupLayout(group, datum);
      })
      .on('end', () => {
        const resizeState = groupResizeStateRef.current;
        if (resizeState) {
          invoke('onGroupResize', resizeState.id, resizeState.next);
        }
        groupResizeStateRef.current = null;
      });
    const groupSelection = groupLayer
      .selectAll<SVGGElement, CanvasGroup>('g.canvas-group')
      .data(groups, (datum) => datum.id)
      .join(
        (enter) => {
          const group = enter.append('g').attr('class', 'canvas-group').style('cursor', 'move');
          group.append('rect').attr('class', 'canvas-group__frame');
          group.append('rect').attr('class', 'canvas-group__header');
          group
            .append('image')
            .attr('class', 'canvas-group__icon')
            .attr('preserveAspectRatio', 'xMidYMid meet');
          group
            .append('text')
            .attr('class', 'canvas-group__title')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle');
          const handlesGroup = group.append('g').attr('class', 'canvas-group__handles');
          handlesGroup
            .selectAll<SVGRectElement, { key: GroupResizeHandle; cursor: string }>('rect.canvas-group__handle')
            .data(groupHandleDefinitions, (handle) => handle.key)
            .join('rect')
            .attr('class', (handle) => `canvas-group__handle canvas-group__handle--${handle.key}`)
            .attr('width', GROUP_HANDLE_SIZE)
            .attr('height', GROUP_HANDLE_SIZE)
            .attr('rx', GROUP_HANDLE_SIZE / 2)
            .attr('ry', GROUP_HANDLE_SIZE / 2)
            .style('cursor', (handle: { key: GroupResizeHandle; cursor: string }) => handle.cursor);
          return group;
        },
        (update) => update,
        (exit) => exit.remove()
      );
    const typedGroupSelection = groupSelection as d3.Selection<
      SVGGElement,
      CanvasGroup,
      SVGGElement,
      unknown
    >;
    typedGroupSelection
      .on('mouseenter', (_event: MouseEvent, datum: CanvasGroup) => {
        invoke('onGroupHover', datum.id);
      })
      .on('mouseleave', () => {
        invoke('onGroupHover', null);
      })
      .on('click', (event: MouseEvent, datum: CanvasGroup) => {
        event.stopPropagation();
        invoke('onContextMenuDismiss');
        invoke('onGroupSelect', datum.id);
      })
      .on('auxclick', (event: MouseEvent, datum: CanvasGroup) => {
        if (event.button === 1) {
          event.preventDefault();
          event.stopPropagation();
          invoke('onGroupAuxClick', event, datum);
        }
      })
      .on('dblclick', (event: MouseEvent, datum: CanvasGroup) => {
        event.stopPropagation();
        invoke('onGroupDoubleClick', datum);
      })
      .on('contextmenu', (event: MouseEvent, datum: CanvasGroup) => {
        event.preventDefault();
        event.stopPropagation();
        invoke('onGroupContextMenu', event, datum);
      });
    (typedGroupSelection as unknown as d3.Selection<SVGGElement, CanvasGroup, any, any>).call(
      groupDragBehaviour as unknown as (
        selection: d3.Selection<SVGGElement, CanvasGroup, any, any>,
        ...args: unknown[]
      ) => void
    );
    const resizeHandleSelection = typedGroupSelection.selectAll<
      SVGRectElement,
      { key: GroupResizeHandle; cursor: string }
    >('g.canvas-group__handles rect.canvas-group__handle');
    (resizeHandleSelection as unknown as d3.Selection<SVGRectElement, { key: GroupResizeHandle; cursor: string }, any, any>).call(
      groupResizeBehaviour as unknown as (
        selection: d3.Selection<SVGRectElement, { key: GroupResizeHandle; cursor: string }, any, any>,
        ...args: unknown[]
      ) => void
    );
    groupGeometryRef.current = {};
    typedGroupSelection.each(function applyGroupStyles(this: SVGGElement, datum: CanvasGroup) {
      const group = d3.select<SVGGElement, CanvasGroup>(this);
      applyGroupLayout(group, datum);
    });
    const groupLinkLayer = groupLinkLayerRef.current;
    const groupLinkHitLayer = groupLinkHitLayerRef.current;
    const groupLinkLabelLayer = groupLinkLabelLayerRef.current;
    if (groupLinkLayer && groupLinkHitLayer && groupLinkLabelLayer) {
      const availableGroupIds = new Set(groups.map((group) => group.id));
      const sanitizedGroupLinks = groupLinks.filter(
        (link) => availableGroupIds.has(link.sourceGroupId) && availableGroupIds.has(link.targetGroupId)
      );
      const groupLinkSelection = groupLinkLayer
        .selectAll<SVGLineElement, GroupLink>('line.group-link')
        .data(sanitizedGroupLinks, (datum) => makeGroupLinkKey(datum))
        .join(
          (enter) =>
            enter
              .append('line')
              .attr('class', 'group-link')
              .attr('stroke-linecap', 'round')
              .attr('visibility', 'hidden'),
          (update) => update,
          (exit) => exit.remove()
        )
        .attr('stroke', edgeBase)
        .attr('stroke-width', 3.5)
        .attr('opacity', 0.32);
      const groupLinkHitSelection = groupLinkHitLayer
        .selectAll<SVGLineElement, GroupLink>('line.group-link-hit')
        .data(sanitizedGroupLinks, (datum) => makeGroupLinkKey(datum))
        .join(
          (enter) =>
            enter
              .append('line')
              .attr('class', 'group-link-hit')
              .attr('stroke', 'transparent')
              .attr('stroke-width', 18)
              .attr('stroke-linecap', 'round')
              .style('pointer-events', 'stroke')
              .style('cursor', 'pointer'),
          (update) => update,
          (exit) => exit.remove()
        );
      groupLinkHitSelection
        .on('mouseenter', (_event, datum) => {
          invoke('onGroupLinkHover', makeGroupLinkKey(datum));
        })
        .on('mouseleave', () => {
          invoke('onGroupLinkHover', null);
        })
        .on('contextmenu', (event: MouseEvent, datum: GroupLink) => {
          event.preventDefault();
          event.stopPropagation();
          invoke('onContextMenuDismiss');
          invoke('onGroupLinkContextMenu', event, datum);
        })
        .on('click', (event: MouseEvent) => {
          event.stopPropagation();
          invoke('onContextMenuDismiss');
        });
      const groupLinkLabelSelection = groupLinkLabelLayer
        .selectAll<SVGTextElement, GroupLink>('text.group-link-label')
        .data(sanitizedGroupLinks, (datum) => makeGroupLinkKey(datum))
        .join('text')
        .attr('class', 'group-link-label')
        .attr('font-size', 11)
        .attr('text-anchor', 'middle')
        .attr('opacity', 0.35)
        .attr('fill', textSecondary)
        .text((datum: GroupLink) => datum.relation || '');
      groupLinkSelectionRef.current = groupLinkSelection as d3.Selection<
        SVGLineElement,
        GroupLink,
        SVGGElement,
        unknown
      >;
      groupLinkHitSelectionRef.current = groupLinkHitSelection as d3.Selection<
        SVGLineElement,
        GroupLink,
        SVGGElement,
        unknown
      >;
      groupLinkLabelSelectionRef.current = groupLinkLabelSelection as d3.Selection<
        SVGTextElement,
        GroupLink,
        SVGGElement,
        unknown
      >;
      updateGroupLinkPositions();
    } else {
      groupLinkSelectionRef.current = null;
      groupLinkHitSelectionRef.current = null;
      groupLinkLabelSelectionRef.current = null;
    }
    groupSelectionRef.current = typedGroupSelection;
    const simulation = d3
      .forceSimulation<SimulationNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simLinks)
          .id((node) => node.id)
          .distance(160)
          .strength(0.12)
      )
      .force('charge', d3.forceManyBody().strength(-140))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<SimulationNode>().radius(44))
      .alphaDecay(0.12)
      .stop();
    for (let tick = 0; tick < 200; tick += 1) {
      simulation.tick();
    }
    const nodesSelection = nodeLayer
      .selectAll<SVGGElement, SimulationNode>('g.node')
      .data(simNodes, (datum) => datum.id)
      .join(
        (enter) => {
          const group = enter.append('g').attr('class', 'node').style('cursor', 'grab');
          group
            .append('circle')
            .attr('class', 'node-hit-area')
            .attr('fill', 'transparent')
            .attr('pointer-events', 'all')
            .attr('r', NODE_BASE_RADIUS + 12);
          group
            .append('image')
            .attr('class', 'node-icon')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('pointer-events', 'none');
          group
            .append('text')
            .attr('class', 'node-label')
            .attr('text-anchor', 'middle')
            .style('pointer-events', 'none');
          return group;
        },
        (update) => update.style('cursor', 'grab'),
        (exit) => exit.remove()
      );
    const schedulePositionsUpdate = () => {
      if (positionFrameRef.current !== null) {
        return;
      }
      positionFrameRef.current = window.requestAnimationFrame(() => {
        positionFrameRef.current = null;
        applyPositions();
      });
    };
    nodesSelection
      .select<SVGImageElement>('image.node-icon')
      .attr('href', (datum) => getNodeIcon(datum.type))
      .attr('width', NODE_BASE_RADIUS * 2)
      .attr('height', NODE_BASE_RADIUS * 2)
      .attr('x', -NODE_BASE_RADIUS)
      .attr('y', -NODE_BASE_RADIUS)
      .style('pointer-events', 'none');
    nodesSelection
      .select<SVGTextElement>('text.node-label')
      .attr('fill', textSecondary)
      .attr('y', NODE_BASE_RADIUS + LABEL_OFFSET)
      .text((datum) => datum.label)
      .style('pointer-events', 'none');
    const linkHitSelection = linkHitLayer
      .selectAll<SVGLineElement, SimulationLink>('line.link-hit')
      .data(simLinks, (datum) => makeEdgeKey(datum))
      .join(
        (enter) =>
          enter
            .append('line')
            .attr('class', 'link-hit')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 14)
            .attr('stroke-linecap', 'round')
            .style('pointer-events', 'stroke')
            .style('cursor', 'pointer'),
        (update) => update,
        (exit) => exit.remove()
      );
    const linkSelection = linkLayer
      .selectAll<SVGLineElement, SimulationLink>('line.link-line')
      .data(simLinks, (datum) => makeEdgeKey(datum))
      .join(
        (enter) =>
          enter
            .append('line')
            .attr('class', 'link-line')
            .attr('stroke-linecap', 'round')
            .style('cursor', 'pointer'),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr('stroke', edgeBase)
      .attr('stroke-width', LINK_BASE_WIDTH)
      .attr('stroke-opacity', 0.45)
      .attr('marker-end', 'url(#arrowhead-base)');
    const linkLabelSelection = linkLabelLayer
      .selectAll<SVGTextElement, SimulationLink>('text.link-label')
      .data(simLinks, (datum) => makeEdgeKey(datum))
      .join(
        (enter) =>
          enter
            .append('text')
            .attr('class', 'link-label')
            .attr('font-size', 11),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr('opacity', 0.35)
      .attr('fill', textSecondary)
      .text((datum) => datum.relation);
    const applyPositions = () => {
      const repositionLink = (
        selection: d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown>
      ) => {
        selection.each(function reposition(datum) {
          const sourceX = resolveAxis(datum.source, 'x');
          const sourceY = resolveAxis(datum.source, 'y');
          const targetX = resolveAxis(datum.target, 'x');
          const targetY = resolveAxis(datum.target, 'y');
          const { sx, sy, tx, ty } = shortenSegment(
            sourceX,
            sourceY,
            targetX,
            targetY,
            NODE_BASE_RADIUS + LINK_SOURCE_PADDING + LINK_BASE_WIDTH / 2,
            NODE_BASE_RADIUS + LINK_TARGET_PADDING + LINK_BASE_WIDTH / 2
          );
          d3.select<SVGLineElement, SimulationLink>(this)
            .attr('x1', sx)
            .attr('y1', sy)
            .attr('x2', tx)
            .attr('y2', ty);
        });
      };
      repositionLink(linkSelection);
      repositionLink(linkHitSelection);
      linkLabelSelection
        .attr('x', (datum) => {
          const sourceX = resolveAxis(datum.source, 'x');
          const targetX = resolveAxis(datum.target, 'x');
          return (sourceX + targetX) / 2;
        })
        .attr('y', (datum) => {
          const sourceY = resolveAxis(datum.source, 'y');
          const targetY = resolveAxis(datum.target, 'y');
          return (sourceY + targetY) / 2;
        });
      nodesSelection.attr('transform', (datum) => `translate(${datum.x ?? 0},${datum.y ?? 0})`);
      nodesSelection
        .select<SVGCircleElement>('circle.node-hit-area')
        .attr('r', NODE_BASE_RADIUS + 12);
      nodesSelection.each((datum) => {
        nodePositionsRef.current[datum.id] = {
          x: datum.x ?? 0,
          y: datum.y ?? 0,
        };
      });
    };
    nodesSelection
      .on('mouseenter', (_event: MouseEvent, datum: SimulationNode) => {
        invoke('onNodeHover', datum.id);
      })
      .on('mouseleave', () => {
        invoke('onNodeHover', null);
      })
      .on('click', (event: MouseEvent, datum: SimulationNode) => {
        event.stopPropagation();
        invoke('onContextMenuDismiss');
        invoke('onEdgeHover', null);
        invoke('onNodeClick', datum);
        invoke('onNodeHover', datum.id);
      })
      .on('dblclick', (event: MouseEvent, datum: SimulationNode) => {
        event.stopPropagation();
        invoke('onContextMenuDismiss');
        invoke('onEdgeHover', null);
        invoke('onNodeClick', datum);
        invoke('onNodeHover', datum.id);
        invoke('onNodeDoubleClick', datum);
      })
      .on('auxclick', (event: MouseEvent, datum: SimulationNode) => {
        if (event.button === 1) {
          event.preventDefault();
          event.stopPropagation();
          invoke('onNodeAuxClick', event, datum);
        }
      })
      .on('contextmenu', (event: MouseEvent, datum: SimulationNode) => {
        event.preventDefault();
        event.stopPropagation();
        invoke('onNodeContextMenu', event, datum);
      });
                    const dragBehaviour = d3
      .drag<SVGGElement, SimulationNode>()
      .on('start', function (
        event: D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
        datum: SimulationNode
      ) {
        event.sourceEvent?.stopPropagation();
        event.sourceEvent?.preventDefault?.();

        nodeDragStateRef.current = {
          id: datum.id,
          x: datum.x ?? 0,
          y: datum.y ?? 0,
        };

        d3.select(this as SVGGElement).raise().style('cursor', 'grabbing');
      })
      .on('drag', function (event: D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
        const dragState = nodeDragStateRef.current;
        if (!dragState) {
          return;
        }

        dragState.x += event.dx;
        dragState.y += event.dy;

        const node = d3.select<SVGGElement, SimulationNode>(this);
        const datum = node.datum();

        datum.x = dragState.x;
        datum.y = dragState.y;
        datum.fx = dragState.x;
        datum.fy = dragState.y;
        datum.vx = 0;
        datum.vy = 0;

        nodePositionsRef.current[datum.id] = { x: dragState.x, y: dragState.y };
        node
          .attr('transform', `translate(${dragState.x},${dragState.y})`)
          .style('cursor', 'grabbing')
          .raise();
        schedulePositionsUpdate();
      })
      .on('end', function () {
        nodeDragStateRef.current = null;
        const node = d3.select<SVGGElement, SimulationNode>(this);
        const datum = node.datum();
        node.style('cursor', 'grab');
        if (datum) {
          invoke('onNodeDragEnd', datum.id, { x: datum.x ?? 0, y: datum.y ?? 0 });
        }
        schedulePositionsUpdate();
      });

    nodesSelection.call(dragBehaviour);





    const handleLinkEnter = (_event: MouseEvent, datum: SimulationLink) => {
      invoke('onEdgeHover', makeEdgeKey(datum));
    };
    const handleLinkLeave = () => {
      invoke('onEdgeHover', null);
    };
    linkSelection.on('mouseenter', handleLinkEnter).on('mouseleave', handleLinkLeave);
    linkHitSelection
      .on('mouseenter', handleLinkEnter)
      .on('mouseleave', handleLinkLeave)
      .on('contextmenu', (event: MouseEvent, datum: SimulationLink) => {
        event.preventDefault();
        event.stopPropagation();
        invoke('onContextMenuDismiss');
        invoke('onLinkContextMenu', event, datum);
      })
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        invoke('onContextMenuDismiss');
      });
    applyPositions();
    nodeSelectionRef.current = nodesSelection as d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
    linkSelectionRef.current = linkSelection as d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown>;
    linkHitSelectionRef.current = linkHitSelection as d3.Selection<
      SVGLineElement,
      SimulationLink,
      SVGGElement,
      unknown
    >;
    linkLabelSelectionRef.current = linkLabelSelection as d3.Selection<
      SVGTextElement,
      SimulationLink,
      SVGGElement,
      unknown
    >;
    return () => {
      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [nodes, links, groupLinks, groups, nodePositionsRef, groupPositionsRef]);
  useEffect(() => {
    const selection = groupSelectionRef.current;
    if (!selection) {
      return;
    }
    selection
      .classed('canvas-group--selected', (datum: CanvasGroup) => datum.id === selectedGroupId)
      .classed('canvas-group--hovered', (datum: CanvasGroup) => datum.id === hoveredGroupId);
  }, [selectedGroupId, hoveredGroupId]);
  useEffect(() => {
    const selection = groupLinkSelectionRef.current;
    if (!selection) {
      return;
    }
    selection
      .attr('stroke', (datum: GroupLink) => {
        const key = makeGroupLinkKey(datum);
        const touchesSelected =
          !!selectedGroupId &&
          (datum.sourceGroupId === selectedGroupId || datum.targetGroupId === selectedGroupId);
        const touchesHovered =
          !!hoveredGroupId &&
          (datum.sourceGroupId === hoveredGroupId || datum.targetGroupId === hoveredGroupId);
        const highlighted = key === hoveredGroupLinkKey || touchesSelected || touchesHovered;
        return highlighted ? accent : edgeBase;
      })
      .attr('opacity', (datum: GroupLink) => {
        const key = makeGroupLinkKey(datum);
        const touchesSelected =
          !!selectedGroupId &&
          (datum.sourceGroupId === selectedGroupId || datum.targetGroupId === selectedGroupId);
        const touchesHovered =
          !!hoveredGroupId &&
          (datum.sourceGroupId === hoveredGroupId || datum.targetGroupId === hoveredGroupId);
        const highlighted = key === hoveredGroupLinkKey || touchesSelected || touchesHovered;
        return highlighted ? 0.6 : 0.32;
      });
    const labelSelection = groupLinkLabelSelectionRef.current;
    if (!labelSelection) {
      return;
    }
    labelSelection
      .attr('fill', (datum: GroupLink) => {
        const key = makeGroupLinkKey(datum);
        const touchesSelected =
          !!selectedGroupId &&
          (datum.sourceGroupId === selectedGroupId || datum.targetGroupId === selectedGroupId);
        const touchesHovered =
          !!hoveredGroupId &&
          (datum.sourceGroupId === hoveredGroupId || datum.targetGroupId === hoveredGroupId);
        const highlighted = key === hoveredGroupLinkKey || touchesSelected || touchesHovered;
        return highlighted ? accent : textSecondary;
      })
      .attr('opacity', (datum: GroupLink) => {
        const key = makeGroupLinkKey(datum);
        const touchesSelected =
          !!selectedGroupId &&
          (datum.sourceGroupId === selectedGroupId || datum.targetGroupId === selectedGroupId);
        const touchesHovered =
          !!hoveredGroupId &&
          (datum.sourceGroupId === hoveredGroupId || datum.targetGroupId === hoveredGroupId);
        const highlighted = key === hoveredGroupLinkKey || touchesSelected || touchesHovered;
        return highlighted ? 0.8 : 0.4;
      })
      .text((datum: GroupLink) => datum.relation || '');
  }, [hoveredGroupLinkKey, selectedGroupId, hoveredGroupId]);
  useEffect(() => {
    const draftLine = draftLineRef.current;
    if (!draftLine) {
      return;
    }
    if (!connectionDraft) {
      draftLine.attr('visibility', 'hidden');
      return;
    }
    const sourcePosition =
      connectionDraft.kind === 'node'
        ? nodePositionsRef.current[connectionDraft.sourceNodeId]
        : groupPositionsRef.current[connectionDraft.sourceGroupId];
    if (!sourcePosition) {
      draftLine.attr('visibility', 'hidden');
      return;
    }
    draftLine
      .attr('visibility', 'visible')
      .attr('x1', sourcePosition.x ?? 0)
      .attr('y1', sourcePosition.y ?? 0)
      .attr('x2', connectionDraft.cursor.x)
      .attr('y2', connectionDraft.cursor.y);
  }, [connectionDraft, groupPositionsRef, nodePositionsRef, nodes, groups]);
  const applyZoomScalar = (scalar: number) => {
    const svgElement = svgRef.current;
    const zoomBehaviour = zoomBehaviourRef.current;
    if (!svgElement || !zoomBehaviour) {
      return;
    }
    const svg = d3.select(svgElement);
    svg.interrupt();
    svg.call(zoomBehaviour.scaleBy, scalar);
  };
  const resetZoom = () => {
    const svgElement = svgRef.current;
    const zoomBehaviour = zoomBehaviourRef.current;
    if (!svgElement || !zoomBehaviour) {
      return;
    }
    const svg = d3.select(svgElement);
    svg.interrupt();
    svg.call(zoomBehaviour.transform, d3.zoomIdentity);
  };
  return {
    nodeSelectionRef,
    linkSelectionRef,
    linkLabelSelectionRef,
    applyZoomScalar,
    resetZoom,
  };
};

