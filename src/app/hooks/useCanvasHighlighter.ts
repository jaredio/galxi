import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as d3 from 'd3';

import {
  NODE_ACTIVE_RADIUS,
  NODE_BASE_RADIUS,
  NODE_HOVER_RADIUS,
  LABEL_OFFSET,
  LINK_SOURCE_PADDING,
  LINK_TARGET_PADDING,
  LINK_BASE_WIDTH,
} from '../../constants/graph';
import { accent, edgeBase, textPrimary, textSecondary } from '../../constants/theme';
import {
  linkTouchesNode,
  makeEdgeKey,
  resolveAxis,
  resolveId,
  shortenSegment,
} from '../../lib/graph-utils';
import type {
  NetworkLink,
  NetworkNode,
  SimulationLink,
  SimulationNode,
} from '../../types/graph';

type SelectionRef<T> = MutableRefObject<d3.Selection<any, T, any, unknown> | null>;

type UseCanvasHighlighterArgs = {
  nodeSelectionRef: SelectionRef<SimulationNode>;
  linkSelectionRef: SelectionRef<SimulationLink>;
  linkLabelSelectionRef: SelectionRef<SimulationLink>;
  activeNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeKey: string | null;
  nodes: NetworkNode[];
  links: NetworkLink[];
};

export const useCanvasHighlighter = ({
  nodeSelectionRef,
  linkSelectionRef,
  linkLabelSelectionRef,
  activeNodeId,
  hoveredNodeId,
  hoveredEdgeKey,
  nodes,
  links,
}: UseCanvasHighlighterArgs) => {
  const previousHighlightRef = useRef<{
    activeNodeId: string | null;
    hoveredNodeId: string | null;
    hoveredEdgeKey: string | null;
  }>({ activeNodeId: null, hoveredNodeId: null, hoveredEdgeKey: null });

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
    nodeSelectionRef,
    linkSelectionRef,
    linkLabelSelectionRef,
  ]);
};
