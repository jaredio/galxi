import type { MutableRefObject } from 'react';

import { select, type Selection } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';

import { accent, edgeBase } from '../../constants/theme';

type LayerSelection<T extends Element> = Selection<T, any, any, unknown>;

export type SceneRefs = {
  containerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  groupLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  groupLinkLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  groupLinkHitLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  groupLinkLabelLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  nodeLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  linkLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  linkHitLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  linkLabelLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  draftLayerRef: MutableRefObject<LayerSelection<SVGGElement> | null>;
  draftLineRef: MutableRefObject<Selection<SVGLineElement, any, any, unknown> | null>;
  svgSelectionRef: MutableRefObject<Selection<SVGSVGElement, unknown, null, undefined> | null>;
  zoomBehaviourRef: MutableRefObject<ZoomBehavior<SVGSVGElement, unknown> | null>;
  viewDimensionsRef: MutableRefObject<{ width: number; height: number }>;
};

type CanvasHandlers = {
  current: {
    onCanvasClick: () => void;
    onContextMenuDismiss: () => void;
  };
};

type SetupSceneArgs = {
  svgRef: MutableRefObject<SVGSVGElement | null>;
  zoomTransformRef: MutableRefObject<ZoomTransform>;
  handlersRef: CanvasHandlers;
  sceneRefs: SceneRefs;
};

export const setupForceGraphScene = ({
  svgRef,
  zoomTransformRef,
  handlersRef,
  sceneRefs,
}: SetupSceneArgs) => {
  const svgElement = svgRef.current;
  if (!svgElement) {
    return undefined;
  }
  const svg = select(svgElement);
  svg.attr('data-theme', 'galxi').style('touch-action', 'none');

  const updateViewBox = () => {
    const width = svgElement.clientWidth || window.innerWidth;
    const height = svgElement.clientHeight || window.innerHeight;
    sceneRefs.viewDimensionsRef.current = { width, height };
    svg.attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`);
  };
  updateViewBox();

  const container = svg.append('g').attr('class', 'graph-root');
  sceneRefs.containerRef.current = container;
  sceneRefs.groupLayerRef.current = container.append('g').attr('class', 'group-layer');
  sceneRefs.groupLinkLayerRef.current = container
    .append('g')
    .attr('class', 'group-link-layer')
    .style('pointer-events', 'none');
  sceneRefs.groupLinkHitLayerRef.current = container.append('g').attr('class', 'group-link-hit-layer');
  sceneRefs.groupLinkLabelLayerRef.current = container
    .append('g')
    .attr('class', 'group-link-label-layer')
    .style('pointer-events', 'none');
  sceneRefs.linkHitLayerRef.current = container.append('g').attr('class', 'link-hit-layer');
  sceneRefs.linkLayerRef.current = container.append('g').attr('class', 'link-layer');
  sceneRefs.linkLabelLayerRef.current = container.append('g').attr('class', 'link-label-layer');
  sceneRefs.nodeLayerRef.current = container.append('g').attr('class', 'node-layer');
  sceneRefs.draftLayerRef.current = container.append('g').attr('class', 'draft-layer').style('pointer-events', 'none');

  sceneRefs.draftLineRef.current = sceneRefs.draftLayerRef.current
    ?.append('line')
    .attr('class', 'draft-link')
    .attr('stroke', accent)
    .attr('stroke-width', 1.8)
    .attr('stroke-dasharray', '6 8')
    .attr('stroke-dashoffset', 0)
    .attr('marker-end', 'url(#arrowhead-accent)')
    .attr('visibility', 'hidden') ?? null;

  const defs = svg.append('defs');
  const arrowHeadLength = 10;
  const arrowHeadRadius = 5;
  defs
    .selectAll<SVGMarkerElement, { id: string; color: string }>('marker')
    .data([
      { id: 'arrowhead-base', color: edgeBase },
      { id: 'arrowhead-accent', color: accent },
    ])
    .join('marker')
    .attr('id', (datum) => datum.id)
    .attr('viewBox', `-${arrowHeadLength} ${-arrowHeadRadius} ${arrowHeadLength} ${arrowHeadRadius * 2}`)
    .attr('refX', 0)
    .attr('refY', 0)
    .attr('markerWidth', arrowHeadLength)
    .attr('markerHeight', arrowHeadRadius * 2)
    .attr('markerUnits', 'userSpaceOnUse')
    .attr('orient', 'auto')
    .append('path')
    .attr('d', `M0,0 L-${arrowHeadLength},${arrowHeadRadius} L-${arrowHeadLength},-${arrowHeadRadius} Z`)
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

  const zoomBehaviour = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 2.5])
    .on('zoom', (event) => {
      container.attr('transform', event.transform.toString());
      zoomTransformRef.current = event.transform;
    });
  sceneRefs.zoomBehaviourRef.current = zoomBehaviour;
  svg.call(zoomBehaviour).call(zoomBehaviour.transform, zoomTransformRef.current || zoomIdentity);

  const handleSvgClick = (event: MouseEvent) => {
    if (event.target === svgElement) {
      const { onCanvasClick, onContextMenuDismiss } = handlersRef.current;
      onContextMenuDismiss();
      onCanvasClick();
    }
  };
  svg.on('click', handleSvgClick as unknown as null);

  const handleResize = () => updateViewBox();
  window.addEventListener('resize', handleResize);
  sceneRefs.svgSelectionRef.current = svg;

  return () => {
    window.removeEventListener('resize', handleResize);
    svg.on('.zoom', null);
    svg.on('click', null);
    svg.selectAll('*').remove();
    sceneRefs.containerRef.current = null;
    sceneRefs.groupLayerRef.current = null;
    sceneRefs.groupLinkLayerRef.current = null;
    sceneRefs.groupLinkHitLayerRef.current = null;
    sceneRefs.groupLinkLabelLayerRef.current = null;
    sceneRefs.nodeLayerRef.current = null;
    sceneRefs.linkLayerRef.current = null;
    sceneRefs.linkHitLayerRef.current = null;
    sceneRefs.linkLabelLayerRef.current = null;
    sceneRefs.draftLayerRef.current = null;
    sceneRefs.draftLineRef.current = null;
    sceneRefs.svgSelectionRef.current = null;
    sceneRefs.zoomBehaviourRef.current = null;
  };
};
