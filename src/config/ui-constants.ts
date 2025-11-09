/**
 * UI Constants - Centralized configuration for component dimensions,
 * spacing, and visual properties
 */

export const PANEL_GEOMETRY = {
  DEFAULT: { width: 820, height: 860 },
  EXPANDED: { width: 960, height: 980 },
  MIN: { width: 320, height: 260 },
  PADDING: { x: 24, y: 80 },
  FOOTER_HEIGHT: 64,
} as const;

export const PROFILE_WINDOW = {
  WIDTH: 420,
  PADDING: { x: 24, y: 80 },
  SPAWN_OFFSET: { column: 40, row: 32 },
  MAX_INSTANCES: 20, // Prevent too many windows from being opened
} as const;

export const GROUP = {
  HEADER_HEIGHT: 32,
  CORNER_RADIUS: 14,
  HANDLE_SIZE: 12,
  MIN_WIDTH: 200,
  MIN_HEIGHT: 140,
} as const;

export const CONNECTION_EDITOR = {
  WIDTH: 420,
  PADDING: { x: 24 },
} as const;

export const GRAPH = {
  ZOOM: {
    MIN_SCALE: 0.5,
    MAX_SCALE: 2.5,
  },
} as const;
