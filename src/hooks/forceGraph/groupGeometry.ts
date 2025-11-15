import { select, type Selection } from 'd3-selection';

import type { CanvasGroup, GroupLink } from '../../types/graph';
import { getGroupIcon } from '../../constants/groupIcons';

export type GroupResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export const GROUP_HEADER_HEIGHT = 32;
export const GROUP_CORNER_RADIUS = 14;
export const GROUP_HANDLE_SIZE = 12;
export const GROUP_MIN_WIDTH = 200;
export const GROUP_MIN_HEIGHT = 140;

export const groupHandleDefinitions: Array<{ key: GroupResizeHandle; cursor: string }> = [
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

export const computeGroupResize = (
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

export const computeHandlePosition = (handle: GroupResizeHandle, width: number, height: number) => {
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
  return { x: centerX + dx / scale, y: centerY + dy / scale };
};

export const resolveGroupLinkSegment = (
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
    return { sx: sourceCenterX, sy: sourceCenterY, tx: targetCenterX, ty: targetCenterY };
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

export const applyGroupLayout = (selection: Selection<SVGGElement, CanvasGroup, any, any>, datum: CanvasGroup) => {
  const iconSize = 16;
  selection
    .attr('transform', `translate(${datum.x},${datum.y})`)
    .classed('canvas-group--virtual-network', datum.type === 'virtualNetwork')
    .classed('canvas-group--subnet', datum.type === 'subnet')
    .classed('canvas-group--logical', datum.type === 'logicalGroup');
  selection
    .select<SVGRectElement>('rect.canvas-group__frame')
    .attr('width', datum.width)
    .attr('height', datum.height)
    .attr('rx', GROUP_CORNER_RADIUS)
    .attr('ry', GROUP_CORNER_RADIUS);
  selection
    .select<SVGRectElement>('rect.canvas-group__header')
    .attr('width', datum.width)
    .attr('height', GROUP_HEADER_HEIGHT)
    .attr('rx', GROUP_CORNER_RADIUS)
    .attr('ry', GROUP_CORNER_RADIUS);
  selection
    .select<SVGImageElement>('image.canvas-group__icon')
    .attr('href', getGroupIcon(datum.type))
    .attr('width', iconSize)
    .attr('height', iconSize)
    .attr('x', 12)
    .attr('y', (GROUP_HEADER_HEIGHT - iconSize) / 2);
  selection
    .select<SVGTextElement>('text.canvas-group__title')
    .attr('x', 12 + iconSize + 8)
    .attr('y', GROUP_HEADER_HEIGHT / 2)
    .text(datum.title);
  selection
    .selectAll<SVGRectElement, { key: GroupResizeHandle; cursor: string }>('g.canvas-group__handles rect.canvas-group__handle')
    .attr('x', (handle) => computeHandlePosition(handle.key, datum.width, datum.height).x)
    .attr('y', (handle) => computeHandlePosition(handle.key, datum.width, datum.height).y);
};

export const updateGroupLinkPositions = (
  geometry: Record<string, { x: number; y: number; width: number; height: number }>,
  groupLinkSelection: Selection<SVGLineElement, GroupLink, SVGGElement, unknown> | null,
  groupLinkHitSelection: Selection<SVGLineElement, GroupLink, SVGGElement, unknown> | null,
  groupLinkLabelSelection: Selection<SVGTextElement, GroupLink, SVGGElement, unknown> | null
) => {
  const positionLineSelection = (
    selection: Selection<SVGLineElement, GroupLink, SVGGElement, unknown> | null
  ) => {
    if (!selection) {
      return;
    }
    selection.each(function positionLink(datum) {
      const source = geometry[datum.sourceGroupId];
      const target = geometry[datum.targetGroupId];
      const line = select<SVGLineElement, GroupLink>(this);
      if (!source || !target) {
        line.attr('visibility', 'hidden');
        return;
      }
      const { sx, sy, tx, ty } = resolveGroupLinkSegment(source, target);
      line.attr('visibility', 'visible').attr('x1', sx).attr('y1', sy).attr('x2', tx).attr('y2', ty);
    });
  };
  const positionLabelSelection = (
    selection: Selection<SVGTextElement, GroupLink, SVGGElement, unknown> | null
  ) => {
    if (!selection) {
      return;
    }
    selection.each(function positionLabel(datum) {
      const source = geometry[datum.sourceGroupId];
      const target = geometry[datum.targetGroupId];
      const label = select<SVGTextElement, GroupLink>(this);
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
  positionLineSelection(groupLinkSelection);
  positionLineSelection(groupLinkHitSelection);
  positionLabelSelection(groupLinkLabelSelection);
};
