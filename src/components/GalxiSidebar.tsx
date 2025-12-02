import { useEffect, useRef, useState } from 'react';

import {
  CircleIcon,
  EraserIcon,
  HandIcon,
  LinkIcon,
  NetworkIcon,
  PaletteIcon,
  PenIcon,
  PlusCircleIcon,
  RectangleIcon,
  SettingsIcon,
  TextIcon,
} from './icons';
import styles from './GalxiSidebar.module.css';

type GroupType = 'virtualNetwork' | 'subnet' | 'logicalGroup';
type DrawingTool = 'rect' | 'circle' | 'pen' | 'text' | 'eraser' | 'hand';

type GalxiSidebarProps = {
  onCreateNode: () => void;
  onCreateGroup: (type: GroupType) => void;
  onStartConnection: () => void;
  onOpenTheme: () => void;
  onOpenSettings: () => void;
  onSelectDrawingTool: (tool: DrawingTool) => void;
  activeDrawingTool: DrawingTool | null;
  penSize: number;
  penColor: string;
  eraserSize: number;
  onPenSizeChange: (value: number) => void;
  onPenColorChange: (value: string) => void;
  onEraserSizeChange: (value: number) => void;
};

export const GalxiSidebar = ({
  onCreateNode,
  onCreateGroup,
  onStartConnection,
  onOpenTheme,
  onOpenSettings,
  onSelectDrawingTool,
  activeDrawingTool,
  penSize,
  penColor,
  eraserSize,
  onPenSizeChange,
  onPenColorChange,
  onEraserSizeChange,
}: GalxiSidebarProps) => {
  const [openConfig, setOpenConfig] = useState<'pen' | 'eraser' | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const closeConfig = () => setOpenConfig(null);

  useEffect(() => {
    if (!openConfig) return;
    const handleGlobal = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (sidebarRef.current && target && sidebarRef.current.contains(target)) {
        return;
      }
      closeConfig();
    };
    document.addEventListener('pointerdown', handleGlobal, true);
    document.addEventListener('click', handleGlobal, true);
    return () => {
      document.removeEventListener('pointerdown', handleGlobal, true);
      document.removeEventListener('click', handleGlobal, true);
    };
  }, [openConfig]);

  const renderBrushPopover = (kind: 'pen' | 'eraser') => {
    const open = openConfig === kind;
    const isPen = kind === 'pen';
    const size = isPen ? penSize : eraserSize;
    const onSizeChange = isPen ? onPenSizeChange : onEraserSizeChange;
    return (
      <div className={`${styles.popover} ${open ? styles.popoverOpen : ''}`}>
        <label className={styles.popoverLabel}>
          Size
          <input
            type="range"
            min={isPen ? 1 : 8}
            max={isPen ? 28 : 40}
            step={1}
            value={size}
            onChange={(event) => onSizeChange(Number(event.currentTarget.value))}
            className={styles.slider}
          />
          <span className={styles.valueChip}>{size}px</span>
        </label>
        {isPen && (
          <label className={styles.popoverLabel}>
            Color
            <input
              type="color"
              value={penColor}
              onChange={(event) => onPenColorChange(event.currentTarget.value)}
              className={styles.colorSwatch}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={`${styles.sidebar} ${openConfig ? styles.sidebarStickyOpen : ''}`}
      aria-label="Canvas create and utility controls"
    >
      <div className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionTitle}>Create</p>
        </div>

        <button type="button" className={styles.command} onClick={onCreateNode}>
          <PlusCircleIcon className={styles.icon} />
          <span className={styles.label}>Node</span>
        </button>

        <button
          type="button"
          className={styles.command}
          onClick={() => {
            closeConfig();
            onStartConnection();
          }}
        >
          <LinkIcon className={styles.icon} />
          <span className={styles.label}>Connection</span>
        </button>

        <button
          type="button"
          className={styles.command}
          onClick={() => {
            closeConfig();
            onCreateGroup('logicalGroup');
          }}
        >
          <NetworkIcon className={styles.icon} />
          <span className={styles.label}>Group</span>
        </button>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionDivider} aria-hidden="true" />
        <div className={styles.sectionHeading}>
          <p className={styles.sectionTitle}>Draw</p>
        </div>

        <button
          type="button"
          className={`${styles.command} ${activeDrawingTool === 'hand' ? styles.commandActive : ''}`}
          onClick={() => {
            closeConfig();
            onSelectDrawingTool('hand');
          }}
        >
          <HandIcon className={styles.icon} />
          <span className={styles.label}>Hand</span>
        </button>
        <button
          type="button"
          className={`${styles.command} ${activeDrawingTool === 'rect' ? styles.commandActive : ''}`}
          onClick={() => {
            closeConfig();
            onSelectDrawingTool('rect');
          }}
        >
          <RectangleIcon className={styles.icon} />
          <span className={styles.label}>Rectangle</span>
        </button>
        <button
          type="button"
          className={`${styles.command} ${activeDrawingTool === 'circle' ? styles.commandActive : ''}`}
          onClick={() => {
            closeConfig();
            onSelectDrawingTool('circle');
          }}
        >
          <CircleIcon className={styles.icon} />
          <span className={styles.label}>Circle</span>
        </button>
        <div className={styles.toolRow}>
          <button
            type="button"
            className={`${styles.command} ${activeDrawingTool === 'pen' ? styles.commandActive : ''}`}
            onClick={() => {
              closeConfig();
              onSelectDrawingTool('pen');
            }}
          >
            <PenIcon className={styles.icon} />
            <span className={styles.label}>Pen</span>
          </button>
          <button
            type="button"
            className={`${styles.configTrigger} ${openConfig === 'pen' ? styles.configTriggerActive : ''}`}
            aria-label="Pen settings"
            aria-expanded={openConfig === 'pen'}
            onClick={(event) => {
              event.stopPropagation();
              setOpenConfig((prev) => (prev === 'pen' ? null : 'pen'));
            }}
          >
            ...
          </button>
          {renderBrushPopover('pen')}
        </div>
        <button
          type="button"
          className={`${styles.command} ${activeDrawingTool === 'text' ? styles.commandActive : ''}`}
          onClick={() => {
            closeConfig();
            onSelectDrawingTool('text');
          }}
        >
          <TextIcon className={styles.icon} />
          <span className={styles.label}>Text</span>
        </button>
        <div className={styles.toolRow}>
          <button
            type="button"
            className={`${styles.command} ${activeDrawingTool === 'eraser' ? styles.commandActive : ''}`}
            onClick={() => {
              closeConfig();
              onSelectDrawingTool('eraser');
            }}
          >
            <EraserIcon className={styles.icon} />
            <span className={styles.label}>Eraser</span>
          </button>
          <button
            type="button"
            className={`${styles.configTrigger} ${openConfig === 'eraser' ? styles.configTriggerActive : ''}`}
            aria-label="Eraser settings"
            aria-expanded={openConfig === 'eraser'}
            onClick={(event) => {
              event.stopPropagation();
              setOpenConfig((prev) => (prev === 'eraser' ? null : 'eraser'));
            }}
          >
            ...
          </button>
          {renderBrushPopover('eraser')}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionDivider} aria-hidden="true" />
        <div className={styles.sectionHeading}>
          <p className={styles.sectionTitle}>Utilities</p>
        </div>

        <button type="button" className={styles.command} onClick={onOpenTheme}>
          <PaletteIcon className={styles.icon} />
          <span className={styles.label}>Theme</span>
        </button>

        <button
          type="button"
          className={styles.command}
          onClick={() => {
            closeConfig();
            onOpenSettings();
          }}
        >
          <SettingsIcon className={styles.icon} />
          <span className={styles.label}>Settings</span>
        </button>
      </div>
    </aside>
  );
};
