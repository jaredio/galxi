import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as d3 from 'd3';
import type { D3DragEvent, ZoomBehavior, ZoomTransform } from 'd3';

import { NODE_BASE_RADIUS, LINK_SOURCE_PADDING, LINK_TARGET_PADDING, LABEL_OFFSET } from '../constants/graph';
import { getNodeIcon } from '../constants/nodeIcons';
import { accent, edgeBase, textSecondary } from '../constants/theme';
import { makeEdgeKey, resolveAxis, shortenSegment } from '../lib/graph-utils';
import type {
  NetworkLink,
  NetworkNode,
  NodePositionMap,
  SimulationLink,
  SimulationNode,
} from '../types/graph';

type ConnectionDraft = {
  sourceNodeId: string;
  cursor: { x: number; y: number };
} | null;

type ForceGraphCallbacks = {
  onNodeHover: (nodeId: string | null) => void;
  onNodeClick: (node: SimulationNode) => void;
  onNodeDoubleClick: (node: SimulationNode) => void;
  onNodeAuxClick: (event: MouseEvent, node: SimulationNode) => void;
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
  connectionDraft: ConnectionDraft;
};

const makeSimulationLink = (link: NetworkLink): SimulationLink => ({ ...link });

export const useForceGraph = ({
  svgRef,
  nodes,
  links,
  nodePositionsRef,
  zoomTransformRef,
  connectionDraft,
  onNodeHover,
  onNodeClick,
  onNodeDoubleClick,
  onNodeAuxClick,
  onEdgeHover,
  onCanvasClick,
  onContextMenuDismiss,
  onNodeContextMenu,
}: UseForceGraphArgs) => {
  const svgSelectionRef = useRef<d3.Selection<SVGSVGElement, any, any, any> | null>(null);
  const containerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const nodeLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const linkLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const linkLabelLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const draftLayerRef = useRef<d3.Selection<SVGGElement, any, any, any> | null>(null);
  const draftLineRef = useRef<d3.Selection<SVGLineElement, any, any, any> | null>(null);

  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown> | null>(null);
  const linkLabelSelectionRef = useRef<d3.Selection<SVGTextElement, SimulationLink, SVGGElement, unknown> | null>(
    null
  );
  const zoomBehaviourRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const viewDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) {
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
    const linkLayer = container.append('g').attr('class', 'link-layer');
    const linkLabelLayer = container.append('g').attr('class', 'link-label-layer');
    const nodeLayer = container.append('g').attr('class', 'node-layer');
    const draftLayer = container.append('g').attr('class', 'draft-layer').style('pointer-events', 'none');
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

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2.5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
        zoomTransformRef.current = event.transform;
      });

    zoomBehaviourRef.current = zoom;
    svg.call(zoom).call(zoom.transform, zoomTransformRef.current);

    svg.on('click', (event: MouseEvent) => {
      if (event.target === svgElement) {
        onContextMenuDismiss();
        onCanvasClick();
      }
    });

    const handleResize = () => updateViewBox();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      svg.on('.zoom', null);
      svg.on('click', null);
      svg.selectAll('*').remove();
      nodeSelectionRef.current = null;
      linkSelectionRef.current = null;
      linkLabelSelectionRef.current = null;
      containerRef.current = null;
      nodeLayerRef.current = null;
      linkLayerRef.current = null;
      linkLabelLayerRef.current = null;
      draftLayerRef.current = null;
      draftLineRef.current = null;
      svgSelectionRef.current = null;
    };
  }, [svgRef, zoomTransformRef, onCanvasClick, onContextMenuDismiss]);

  useEffect(() => {
    const nodeLayer = nodeLayerRef.current;
    const linkLayer = linkLayerRef.current;
    const linkLabelLayer = linkLabelLayerRef.current;
    const svgElement = svgRef.current;

    if (!nodeLayer || !linkLayer || !linkLabelLayer || !svgElement) {
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
          const group = enter.append('g').attr('class', 'node').style('cursor', 'pointer');

          group
            .append('image')
            .attr('class', 'node-icon')
            .attr('preserveAspectRatio', 'xMidYMid meet');

          group
            .append('text')
            .attr('class', 'node-label')
            .attr('text-anchor', 'middle');

          return group;
        },
        (update) => update,
        (exit) => exit.remove()
      );

    nodesSelection
      .select<SVGImageElement>('image.node-icon')
      .attr('href', (datum) => getNodeIcon(datum.type))
      .attr('width', NODE_BASE_RADIUS * 2)
      .attr('height', NODE_BASE_RADIUS * 2)
      .attr('x', -NODE_BASE_RADIUS)
      .attr('y', -NODE_BASE_RADIUS);

    nodesSelection
      .select<SVGTextElement>('text.node-label')
      .attr('fill', textSecondary)
      .attr('y', NODE_BASE_RADIUS + LABEL_OFFSET)
      .text((datum) => datum.label);

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
      .attr('stroke-width', 1.6)
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

    const updatePositions = () => {
      linkSelection.each(function repositionLink(datum) {
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

      nodesSelection.attr('transform', (datum) => `translate(${datum.x ?? 0},${datum.y ?? 0})`);

      nodesSelection.each((datum) => {
        nodePositionsRef.current[datum.id] = {
          x: datum.x ?? 0,
          y: datum.y ?? 0,
        };
      });
    };

    nodesSelection
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
      .on('auxclick', (event: MouseEvent, datum: SimulationNode) => {
        if (event.button === 1) {
          event.preventDefault();
          event.stopPropagation();
          onNodeAuxClick(event, datum);
        }
      })
      .on('contextmenu', (event: MouseEvent, datum: SimulationNode) => {
        event.preventDefault();
        event.stopPropagation();
        onNodeContextMenu(event, datum);
      });

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

    nodesSelection.call(dragBehaviour);

    linkSelection
      .on('mouseenter', (_event: MouseEvent, datum: SimulationLink) => {
        onEdgeHover(makeEdgeKey(datum));
      })
      .on('mouseleave', () => {
        onEdgeHover(null);
      });

    updatePositions();

    nodeSelectionRef.current = nodesSelection as d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
    linkSelectionRef.current = linkSelection as d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown>;
    linkLabelSelectionRef.current = linkLabelSelection as d3.Selection<
      SVGTextElement,
      SimulationLink,
      SVGGElement,
      unknown
    >;
  }, [
    nodes,
    links,
    nodePositionsRef,
    onNodeHover,
    onNodeClick,
    onNodeAuxClick,
    onNodeDoubleClick,
    onEdgeHover,
    onContextMenuDismiss,
    onNodeContextMenu,
  ]);

  useEffect(() => {
    const draftLine = draftLineRef.current;
    if (!draftLine) {
      return;
    }

    if (!connectionDraft) {
      draftLine.attr('visibility', 'hidden');
      return;
    }

    const sourcePosition = nodePositionsRef.current[connectionDraft.sourceNodeId];
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
  }, [connectionDraft, nodePositionsRef, nodes]);

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
