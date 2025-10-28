import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as d3 from 'd3';
import type { D3DragEvent, ZoomBehavior, ZoomTransform } from 'd3';

import { NODE_BASE_RADIUS, LINK_SOURCE_PADDING, LINK_TARGET_PADDING, LABEL_OFFSET } from '../constants/graph';
import { getNodeIcon } from '../constants/nodeIcons';
import { accent, edgeBase, textPrimary, textSecondary } from '../constants/theme';
import { makeEdgeKey, resolveAxis, shortenSegment } from '../lib/graph-utils';
import type {
  NetworkLink,
  NetworkNode,
  NodePositionMap,
  SimulationLink,
  SimulationNode,
} from '../types/graph';

type ForceGraphCallbacks = {
  onNodeHover: (nodeId: string | null) => void;
  onNodeClick: (node: SimulationNode) => void;
  onNodeDoubleClick: (node: SimulationNode) => void;
  onEdgeHover: (edgeKey: string | null) => void;
  onCanvasClick: () => void;
  onContextMenuDismiss: () => void;
  onNodeContextMenu: (event: MouseEvent, node: SimulationNode) => void;
};

type UseForceGraphArgs = ForceGraphCallbacks & {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  nodes: NetworkNode[];
  links: NetworkLink[];
  nodePositionsRef: MutableRefObject<NodePositionMap>;
  zoomTransformRef: MutableRefObject<ZoomTransform>;
};

export const useForceGraph = ({
  svgRef,
  nodes,
  links,
  nodePositionsRef,
  zoomTransformRef,
  onNodeHover,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeHover,
  onCanvasClick,
  onContextMenuDismiss,
  onNodeContextMenu,
}: UseForceGraphArgs) => {
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown> | null>(null);
  const linkLabelSelectionRef = useRef<d3.Selection<SVGTextElement, SimulationLink, SVGGElement, unknown> | null>(
    null
  );
  const zoomBehaviourRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();
    svg.attr('data-theme', 'galxi').style('touch-action', 'none');

    const width = svgElement.clientWidth || window.innerWidth;
    const height = svgElement.clientHeight || window.innerHeight;

    svg.attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`);

    const container = svg.append('g').attr('class', 'graph-root');
    const linkLayer = container.append('g').attr('class', 'link-layer');
    const linkLabelLayer = container.append('g').attr('class', 'link-label-layer');
    const nodeLayer = container.append('g').attr('class', 'node-layer');

    const simNodes: SimulationNode[] = nodes.map((node) => {
      if (!nodePositionsRef.current[node.id]) {
        nodePositionsRef.current[node.id] = {
          x: (Math.random() - 0.5) * width * 0.6,
          y: (Math.random() - 0.5) * height * 0.6,
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

    const simLinks: SimulationLink[] = links.map((link) => ({ ...link }));

    const linkSelection = linkLayer
      .selectAll<SVGLineElement, SimulationLink>('line')
      .data(simLinks)
      .join('line')
      .attr('class', 'link-line')
      .attr('stroke', edgeBase)
      .attr('stroke-width', 1.6)
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.45)
      .style('cursor', 'pointer')
      .attr('marker-end', 'url(#arrowhead-base)');

    const linkLabelSelection = linkLabelLayer
      .selectAll<SVGTextElement, SimulationLink>('text')
      .data(simLinks)
      .join('text')
      .attr('class', 'link-label')
      .attr('fill', textSecondary)
      .attr('font-size', 11)
      .attr('opacity', 0.35)
      .text((datum) => datum.relation);

    const nodeSelection = nodeLayer
      .selectAll<SVGGElement, SimulationNode>('g')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    nodeSelection
      .append('image')
      .attr('class', 'node-icon')
      .attr('href', (datum) => getNodeIcon(datum.type))
      .attr('x', -NODE_BASE_RADIUS)
      .attr('y', -NODE_BASE_RADIUS)
      .attr('width', NODE_BASE_RADIUS * 2)
      .attr('height', NODE_BASE_RADIUS * 2)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    nodeSelection
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('y', NODE_BASE_RADIUS + LABEL_OFFSET)
      .attr('fill', textPrimary)
      .text((datum) => datum.label);

    const updatePositions = () => {
      linkSelection.each(function updateLink(datum) {
        const sourceX = resolveAxis(datum.source, 'x');
        const sourceY = resolveAxis(datum.source, 'y');
        const targetX = resolveAxis(datum.target, 'x');
        const targetY = resolveAxis(datum.target, 'y');

        const { sx, sy, tx, ty } = shortenSegment(
          sourceX,
          sourceY,
          targetX,
          targetY,
          NODE_BASE_RADIUS + LINK_SOURCE_PADDING,
          NODE_BASE_RADIUS + LINK_TARGET_PADDING
        );

        d3.select<SVGLineElement, SimulationLink>(this)
          .attr('x1', sx)
          .attr('y1', sy)
          .attr('x2', tx)
          .attr('y2', ty);
      });

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

      nodeSelection.attr('transform', (datum) => `translate(${datum.x ?? 0},${datum.y ?? 0})`);
      nodeSelection.each((datum) => {
        nodePositionsRef.current[datum.id] = {
          x: datum.x ?? 0,
          y: datum.y ?? 0,
        };
      });
    };

    nodeSelection
      .on('mouseenter', (_event: MouseEvent, datum: SimulationNode) => {
        onNodeHover(datum.id);
      })
      .on('mouseleave', () => {
        onNodeHover(null);
      })
      .on('click', (event: MouseEvent, datum: SimulationNode) => {
        event.stopPropagation();
        onContextMenuDismiss();
        onEdgeHover(null);
        onNodeClick(datum);
        onNodeHover(datum.id);
      })
      .on('dblclick', (event: MouseEvent, datum: SimulationNode) => {
        event.stopPropagation();
        onContextMenuDismiss();
        onEdgeHover(null);
        onNodeClick(datum);
        onNodeHover(datum.id);
        onNodeDoubleClick(datum);
      })
      .on('contextmenu', (event: MouseEvent, datum: SimulationNode) => {
        event.preventDefault();
        event.stopPropagation();
        onNodeContextMenu(event, datum);
      });

    linkSelection
      .on('mouseenter', (_event: MouseEvent, datum: SimulationLink) => {
        onEdgeHover(makeEdgeKey(datum));
      })
      .on('mouseleave', () => {
        onEdgeHover(null);
      });

    svg.on('click', (event: MouseEvent) => {
      if (event.target === svgElement) {
        onCanvasClick();
      }
    });

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2.5])
      .on('zoom', (zoomEvent) => {
        container.attr('transform', zoomEvent.transform.toString());
        zoomTransformRef.current = zoomEvent.transform;
      });

    zoomBehaviourRef.current = zoom;
    svg.call(zoom).call(zoom.transform, zoomTransformRef.current);

    const dragBehaviour = d3
      .drag<SVGGElement, SimulationNode>()
      .on('drag', (dragEvent: D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, datum: SimulationNode) => {
        datum.x = dragEvent.x;
        datum.y = dragEvent.y;
        datum.fx = dragEvent.x;
        datum.fy = dragEvent.y;
        datum.vx = 0;
        datum.vy = 0;
        updatePositions();
      })
      .on('end', (dragEvent: D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, datum: SimulationNode) => {
        datum.x = dragEvent.x;
        datum.y = dragEvent.y;
        datum.fx = dragEvent.x;
        datum.fy = dragEvent.y;
        datum.vx = 0;
        datum.vy = 0;
        updatePositions();
      });

    nodeSelection.call(dragBehaviour);

    const defs = svg.append('defs');

    const markerData = [
      { id: 'arrowhead-base', color: edgeBase },
      { id: 'arrowhead-accent', color: accent },
    ];

    const markers = defs
      .selectAll<SVGMarkerElement, { id: string; color: string }>('marker')
      .data(markerData)
      .join('marker')
      .attr('id', (datum) => datum.id)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto');

    markers.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', (datum) => datum.color);

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

    for (let i = 0; i < 200; i += 1) {
      simulation.tick();
    }

    simNodes.forEach((node) => {
      node.fx = node.x ?? 0;
      node.fy = node.y ?? 0;
      node.vx = 0;
      node.vy = 0;
    });

    updatePositions();

    nodeSelectionRef.current = nodeSelection;
    linkSelectionRef.current = linkSelection;
    linkLabelSelectionRef.current = linkLabelSelection;

    return () => {
      svg.on('.zoom', null);
      svg.on('click', null);
    };
  }, [
    svgRef,
    nodes,
    links,
    nodePositionsRef,
    zoomTransformRef,
    onNodeHover,
    onNodeClick,
    onNodeDoubleClick,
    onEdgeHover,
    onCanvasClick,
    onContextMenuDismiss,
    onNodeContextMenu,
  ]);

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
    zoomBehaviourRef,
    applyZoomScalar,
    resetZoom,
  };
};
