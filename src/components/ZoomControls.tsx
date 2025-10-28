type ZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) => (
  <div className="zoom-controls" aria-label="Canvas zoom controls">
    <button type="button" className="zoom-button" onClick={onZoomOut}>
      -
    </button>
    <button type="button" className="zoom-button" onClick={onReset}>
      Reset
    </button>
    <button type="button" className="zoom-button" onClick={onZoomIn}>
      +
    </button>
  </div>
);
