import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Circle, Group, Layer, Line, Rect, Stage, Text as KonvaText } from 'react-konva';
import type Konva from 'konva';
import getStroke from 'perfect-freehand';
import type { KonvaEventObject } from 'konva/lib/Node';

import type { CanvasDrawing, DrawingTool } from '../types/graph';

type DrawingLayerProps = {
  tool: DrawingTool | null;
  drawings: CanvasDrawing[];
  onChange: (next: CanvasDrawing[]) => void;
  penSize: number;
  penColor: string;
  eraserSize: number;
  size: { width: number; height: number };
  canvasRef: MutableRefObject<SVGSVGElement | null>;
  zoomTransformRef: MutableRefObject<{ x: number; y: number; k: number }>;
};

type Point = { x: number; y: number };

const createId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_PEN_SIZE = 6;
const DEFAULT_ERASER_SIZE = 18;
const DEFAULT_PEN_COLOR = '#6b7280';
const ACCENT = '#2b2f36';
const ACCENT_RGB = '43, 47, 54';
const ACCENT_SOFT = `rgba(${ACCENT_RGB}, 0.8)`;
const ACCENT_FILL = `rgba(${ACCENT_RGB}, 0.12)`;
const ACCENT_FILL_ACTIVE = `rgba(${ACCENT_RGB}, 0.16)`;

const penPointsToPath = (points: Point[], size: number) => {
  const stroke = getStroke(points, { size, thinning: 0.4, smoothing: 0.6 });
  if (!stroke.length) return '';
  const d = stroke
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');
  return `${d} Z`;
};

const hitTest = (drawing: CanvasDrawing, point: Point, tolerance = 8) => {
  if (drawing.type === 'eraser') {
    return false;
  }
  if (drawing.type === 'rect') {
    const x1 = drawing.x ?? 0;
    const y1 = drawing.y ?? 0;
    const x2 = x1 + (drawing.width ?? 0);
    const y2 = y1 + (drawing.height ?? 0);
    return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2;
  }
  if (drawing.type === 'circle') {
    const dx = point.x - (drawing.x ?? 0);
    const dy = point.y - (drawing.y ?? 0);
    return Math.hypot(dx, dy) <= (drawing.radius ?? 0);
  }
  if (drawing.type === 'pen') {
    return (drawing.points ?? []).some((p) => Math.hypot(p.x - point.x, p.y - point.y) <= tolerance);
  }
  if (drawing.type === 'text') {
    return Math.hypot((drawing.x ?? 0) - point.x, (drawing.y ?? 0) - point.y) < 10;
  }
  return false;
};

const toGraphCoords = (screen: Point, size: { width: number; height: number }, transform: { x: number; y: number; k: number }) => {
  const cx = size.width / 2;
  const cy = size.height / 2;
  return {
    x: (screen.x - cx - transform.x) / transform.k,
    y: (screen.y - cy - transform.y) / transform.k,
  };
};

const circleCursor = (radius: number, stroke: string) => {
  const r = Math.max(4, Math.min(radius, 48));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${r * 2}' height='${r * 2}'><circle cx='${r}' cy='${r}' r='${r - 1}' fill='none' stroke='${stroke}' stroke-width='2' /></svg>`;
  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}") ${r} ${r}, auto`;
};

export const DrawingLayer = ({
  tool,
  drawings,
  onChange,
  penSize,
  penColor,
  eraserSize,
  size,
  canvasRef,
  zoomTransformRef,
}: DrawingLayerProps) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const [draft, setDraft] = useState<CanvasDrawing | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const moveStateRef = useRef<{ id: string; origin: Point; original: CanvasDrawing } | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const isHandDraggingRef = useRef(false);
  const penCursor = useMemo(() => circleCursor(penSize, DEFAULT_PEN_COLOR), [penSize]);
  const eraserCursor = useMemo(() => circleCursor(eraserSize, '#e5e7eb'), [eraserSize]);

  const getGraphPointer = () => {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    const t = zoomTransformRef.current ?? { x: 0, y: 0, k: 1 };
    return toGraphCoords(pos, size, t);
  };

  const eraseAt = (point: Point) => {
    setDraft((prev) => {
      if (!prev || prev.type !== 'eraser') {
        return { id: createId(), type: 'eraser', points: [point], size: eraserSize };
      }
      return { ...prev, points: [...(prev.points ?? []), point] };
    });
  };

  const forwardToCanvas = (nativeEvt: PointerEvent | MouseEvent) => {
    const svg = canvasRef.current;
    if (!svg) return;
    const clone = new PointerEvent(nativeEvt.type, nativeEvt as PointerEventInit);
    svg.dispatchEvent(clone);
  };

  const handlePointerDown = (evt: KonvaEventObject<MouseEvent>) => {
    if (!tool) return;
    const nativeEvt = evt.evt as PointerEvent;
    const point = getGraphPointer();

    if (tool === 'hand') {
      const hit = [...drawings].reverse().find((d) => hitTest(d, point));
      if (hit && hit.type !== 'pen' && hit.type !== 'eraser') {
        setSelectedId(hit.id);
        moveStateRef.current = { id: hit.id, origin: point, original: hit };
        isHandDraggingRef.current = true;
      } else {
        setSelectedId(null);
        moveStateRef.current = null;
        isHandDraggingRef.current = false;
        forwardToCanvas(nativeEvt);
      }
      return;
    }

    if (tool === 'eraser') {
      eraseAt(point);
      return;
    }

    if (tool === 'text') {
      const value = window.prompt('Text')?.trim();
      if (value) {
        onChange([...drawings, { id: createId(), type: 'text', x: point.x, y: point.y, text: value }]);
      }
      return;
    }

    if (tool === 'pen') {
      lastPointRef.current = point;
      setDraft({ id: createId(), type: 'pen', points: [point], size: penSize, color: penColor });
      return;
    }

    if (tool === 'rect' || tool === 'circle') {
      setDraft({
        id: createId(),
        type: tool,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        radius: 0,
      });
    }
  };

  const handlePointerMove = (evt: KonvaEventObject<MouseEvent>) => {
    if (!tool) return;
    const nativeEvt = evt.evt as PointerEvent;
    const point = getGraphPointer();

    if (tool === 'hand' && moveStateRef.current && selectedId === moveStateRef.current.id) {
      const delta = { x: point.x - moveStateRef.current.origin.x, y: point.y - moveStateRef.current.origin.y };
      const next = drawings.map((drawing) => {
        if (drawing.id !== moveStateRef.current?.id) return drawing;
        const base = moveStateRef.current?.original;
        if (!base) return drawing;
        if (base.type === 'pen' && base.points) {
          return { ...base, points: base.points.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y })) };
        }
        if (base.type === 'rect' || base.type === 'circle' || base.type === 'text') {
          return { ...base, x: (base.x ?? 0) + delta.x, y: (base.y ?? 0) + delta.y };
        }
        return drawing;
      });
      onChange(next);
      return;
    }

    if (tool === 'hand' && !moveStateRef.current) {
      forwardToCanvas(nativeEvt);
      return;
    }

    if (!draft) return;
    setDraft((prev) => {
      if (!prev) return prev;
      if (prev.type === 'pen') {
        const last = lastPointRef.current;
        if (last && Math.hypot(point.x - last.x, point.y - last.y) < 6) {
          return prev;
        }
        lastPointRef.current = point;
        return { ...prev, points: [...(prev.points ?? []), point] };
      }
      if (prev.type === 'rect') {
        return { ...prev, width: point.x - (prev.x ?? 0), height: point.y - (prev.y ?? 0) };
      }
      if (prev.type === 'circle') {
        const radius = Math.max(Math.abs(point.x - (prev.x ?? 0)), Math.abs(point.y - (prev.y ?? 0))) / 2;
        return { ...prev, radius };
      }
      if (prev.type === 'eraser') {
        return { ...prev, points: [...(prev.points ?? []), point] };
      }
      return prev;
    });
  };

  const handlePointerUp = (evt: KonvaEventObject<MouseEvent>) => {
    if (tool === 'hand') {
      moveStateRef.current = null;
      if (!isHandDraggingRef.current) {
        forwardToCanvas(evt.evt as PointerEvent);
      }
      isHandDraggingRef.current = false;
      return;
    }
    if (draft) {
      onChange([...drawings, draft]);
      setDraft(null);
    }
  };

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const t = zoomTransformRef.current ?? { x: 0, y: 0, k: 1 };
      const layer = layerRef.current;
      if (layer) {
        layer.position({ x: size.width / 2 + t.x, y: size.height / 2 + t.y });
        layer.scale({ x: t.k, y: t.k });
        layer.batchDraw();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [size.width, size.height, zoomTransformRef]);

  const handleContextMenu = (e: any) => {
    e.evt?.preventDefault?.();
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    const shape = layerRef.current?.getIntersection(pos);
    const drawingId = shape?.getAttr('data-drawing-id') as string | undefined;
    if (!drawingId) {
      return;
    }
    const target = drawings.find((d) => d.id === drawingId);
    if (target && (target.type === 'rect' || target.type === 'circle')) {
      onChange(drawings.filter((d) => d.id !== drawingId));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: tool ? 'auto' : 'none',
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        onWheel={(e) => {
          if (!tool) return;
          const svg = canvasRef.current;
          if (!svg) return;
          e.evt.preventDefault();
          const evt = new WheelEvent('wheel', {
            deltaX: e.evt.deltaX,
            deltaY: e.evt.deltaY,
            clientX: e.evt.clientX,
            clientY: e.evt.clientY,
            ctrlKey: e.evt.ctrlKey,
            metaKey: e.evt.metaKey,
            bubbles: true,
            cancelable: true,
          });
          svg.dispatchEvent(evt);
        }}
        listening={!!tool}
        style={{
          pointerEvents: tool ? 'auto' : 'none',
          cursor:
            tool === 'pen'
              ? penCursor
              : tool === 'eraser'
              ? eraserCursor
              : tool
              ? 'crosshair'
              : 'default',
        }}
      >
        <Layer listening={!!tool} ref={layerRef}>
          <Group>
            {drawings.map((drawing) => {
              if (drawing.type === 'eraser') {
                const eraserStroke = drawing.size ?? DEFAULT_ERASER_SIZE;
                const path = penPointsToPath(drawing.points ?? [], eraserStroke);
                return (
                  <Line
                    key={drawing.id}
                    data-drawing-id={drawing.id}
                    points={[]}
                    data-path={path}
                    strokeEnabled={false}
                    listening={false}
                    globalCompositeOperation="destination-out"
                    sceneFunc={(context, shape) => {
                      const ctx = context._context;
                      ctx.save();
                      ctx.fillStyle = '#000';
                      const p = new Path2D(path);
                      ctx.fill(p);
                      ctx.restore();
                      context.fillStrokeShape(shape);
                    }}
                  />
                );
              }
              if (drawing.type === 'rect') {
                return (
                  <Rect
                    key={drawing.id}
                    data-drawing-id={drawing.id}
                    x={drawing.x ?? 0}
                    y={drawing.y ?? 0}
                    width={drawing.width ?? 0}
                    height={drawing.height ?? 0}
                    stroke={drawing.id === selectedId ? ACCENT : ACCENT_SOFT}
                    strokeWidth={drawing.id === selectedId ? 2 : 1.6}
                    fill={drawing.id === selectedId ? ACCENT_FILL_ACTIVE : ACCENT_FILL}
                  />
                );
              }
              if (drawing.type === 'circle') {
                return (
                  <Circle
                    key={drawing.id}
                    data-drawing-id={drawing.id}
                    x={drawing.x ?? 0}
                    y={drawing.y ?? 0}
                    radius={drawing.radius ?? 0}
                    stroke={drawing.id === selectedId ? ACCENT : ACCENT_SOFT}
                    strokeWidth={drawing.id === selectedId ? 2 : 1.6}
                    fill={drawing.id === selectedId ? ACCENT_FILL_ACTIVE : ACCENT_FILL}
                  />
                );
              }
              if (drawing.type === 'pen') {
                const pts = drawing.points ?? [];
                const path = penPointsToPath(pts, drawing.size ?? DEFAULT_PEN_SIZE);
                return (
                  <Line
                    key={drawing.id}
                    data-drawing-id={drawing.id}
                    points={[]}
                    data-path={path}
                    strokeEnabled={false}
                    listening={false}
                    sceneFunc={(context, shape) => {
                      const ctx = context._context;
                      ctx.save();
                      ctx.fillStyle = drawing.color ?? DEFAULT_PEN_COLOR;
                      const p = new Path2D(path);
                      ctx.fill(p);
                      ctx.restore();
                      context.fillStrokeShape(shape);
                    }}
                  />
                );
              }
              if (drawing.type === 'text') {
                return (
                  <KonvaText
                    key={drawing.id}
                    data-drawing-id={drawing.id}
                    x={drawing.x ?? 0}
                    y={drawing.y ?? 0}
                    text={drawing.text ?? ''}
                    fontSize={14}
                    fill="#e6f1ec"
                  />
                );
              }
              return null;
            })}
            {draft?.type === 'rect' && (
              <Rect
                x={draft.x ?? 0}
                y={draft.y ?? 0}
                width={draft.width ?? 0}
                height={draft.height ?? 0}
                stroke={ACCENT}
                strokeWidth={1.6}
                dash={[6, 6]}
              />
            )}
            {draft?.type === 'circle' && (
              <Circle
                x={draft.x ?? 0}
                y={draft.y ?? 0}
                radius={draft.radius ?? 0}
                stroke={ACCENT}
                strokeWidth={1.6}
                dash={[6, 6]}
              />
            )}
            {draft?.type === 'pen' && (
              <Line
                points={[]}
                data-path={penPointsToPath(draft.points ?? [], draft.size ?? penSize)}
                strokeEnabled={false}
                listening={false}
                sceneFunc={(context, shape) => {
                  const ctx = context._context;
                  ctx.save();
                  ctx.fillStyle = draft.color ?? penColor ?? DEFAULT_PEN_COLOR;
                  const p = new Path2D(shape.getAttr('data-path'));
                  ctx.fill(p);
                  ctx.restore();
                  context.fillStrokeShape(shape);
                }}
              />
            )}
            {draft?.type === 'eraser' && (
              <Line
                points={[]}
                data-path={penPointsToPath(draft.points ?? [], draft.size ?? eraserSize)}
                strokeEnabled={false}
                listening={false}
                globalCompositeOperation="destination-out"
                sceneFunc={(context, shape) => {
                  const ctx = context._context;
                  ctx.save();
                  ctx.fillStyle = '#000';
                  const p = new Path2D(shape.getAttr('data-path'));
                  ctx.fill(p);
                  ctx.restore();
                  context.fillStrokeShape(shape);
                }}
              />
            )}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};
