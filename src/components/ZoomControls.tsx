import styles from './ZoomControls.module.css';

type ZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) => (
  <div className={styles.controls} aria-label="Canvas zoom controls">
    <button type="button" className={styles.button} onClick={onZoomOut}>
      -
    </button>
    <button type="button" className={styles.button} onClick={onReset}>
      Reset
    </button>
    <button type="button" className={styles.button} onClick={onZoomIn}>
      +
    </button>
  </div>
);
