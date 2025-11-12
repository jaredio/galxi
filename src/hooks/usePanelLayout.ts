import { useCallback, useEffect, useRef, useState } from 'react';

type PanelGeometry = { x: number; y: number; width: number; height: number };

const INITIAL_GEOMETRY: PanelGeometry = {
  x: 48,
  y: 72,
  width: 820,
  height: 860,
};

const EXPANDED_GEOMETRY = {
  width: 960,
  height: 980,
};

export const usePanelLayout = () => {
  const viewportRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const [panelGeometry, setPanelGeometry] = useState<PanelGeometry>(INITIAL_GEOMETRY);
  const [panelExpanded, setPanelExpanded] = useState(false);

  const clampPanelGeometry = useCallback((geometry: PanelGeometry) => {
    const viewport = viewportRef.current;
    const minWidth = 320;
    const minHeight = 260;
    const maxWidth = viewport.width ? Math.max(minWidth, viewport.width - 80) : 1600;
    const maxHeight = viewport.height ? Math.max(minHeight, viewport.height - 80) : 1200;
    const width = Math.min(Math.max(geometry.width, minWidth), maxWidth);
    const height = Math.min(Math.max(geometry.height, minHeight), maxHeight);
    const maxX = Math.max(0, (viewport.width || width) - width - 24);
    const maxY = Math.max(0, (viewport.height || height) - height - 24);
    const x = Math.min(Math.max(geometry.x, 16), maxX);
    const y = Math.min(Math.max(geometry.y, 48), maxY);
    return { x, y, width, height };
  }, []);

  const updatePanelGeometry = useCallback(
    (updater: (prev: PanelGeometry) => PanelGeometry) => {
      setPanelGeometry((prev) => clampPanelGeometry(updater(prev)));
    },
    [clampPanelGeometry]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const updateViewport = () => {
      viewportRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      updatePanelGeometry((prev) => prev);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [updatePanelGeometry]);

  const ensurePanelVisible = useCallback(() => {
    updatePanelGeometry((prev) => prev);
  }, [updatePanelGeometry]);

  const collapsePanel = useCallback(() => {
    setPanelExpanded(false);
    updatePanelGeometry((prev) => ({
      ...prev,
      width: INITIAL_GEOMETRY.width,
      height: INITIAL_GEOMETRY.height,
    }));
  }, [updatePanelGeometry]);

  const handlePanelMove = useCallback(
    (position: { x: number; y: number }) => {
      updatePanelGeometry((prev) => ({
        ...prev,
        x: position.x,
        y: position.y,
      }));
    },
    [updatePanelGeometry]
  );

  const handlePanelResize = useCallback(
    (geometry: PanelGeometry) => {
      updatePanelGeometry(() => geometry);
    },
    [updatePanelGeometry]
  );

  const handlePanelToggleExpand = useCallback(() => {
    setPanelExpanded((prev) => {
      const next = !prev;
      updatePanelGeometry((current) => ({
        ...current,
        width: next ? EXPANDED_GEOMETRY.width : INITIAL_GEOMETRY.width,
        height: next ? EXPANDED_GEOMETRY.height : INITIAL_GEOMETRY.height,
      }));
      return next;
    });
  }, [updatePanelGeometry]);

  return {
    panelGeometry,
    panelExpanded,
    collapsePanel,
    ensurePanelVisible,
    handlePanelMove,
    handlePanelResize,
    handlePanelToggleExpand,
  };
};
