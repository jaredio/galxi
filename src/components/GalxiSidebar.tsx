import { LinkIcon, NetworkIcon, PaletteIcon, PlusCircleIcon, SettingsIcon } from './icons';
import styles from './GalxiSidebar.module.css';

type GroupType = 'virtualNetwork' | 'subnet' | 'logicalGroup';

type GalxiSidebarProps = {
  onCreateNode: () => void;
  onCreateGroup: (type: GroupType) => void;
  onStartConnection: () => void;
  onOpenTheme: () => void;
  onOpenSettings: () => void;
};

const brandLogo = new URL('../../icons/galxi_green.png', import.meta.url).href;

export const GalxiSidebar = ({
  onCreateNode,
  onCreateGroup,
  onStartConnection,
  onOpenTheme,
  onOpenSettings,
}: GalxiSidebarProps) => {
  return (
    <aside className={styles.sidebar} aria-label="Canvas create and utility controls">
      <div className={styles.section}>
        <div className={`${styles.sectionHeading} ${styles.sectionHeadingLogo}`}>
          <img
            src={brandLogo}
            alt=""
            aria-hidden="true"
            className={styles.sectionLogo}
          />
          <p className={styles.sectionTitle}>Create</p>
        </div>

        <button type="button" className={styles.command} onClick={onCreateNode}>
          <PlusCircleIcon className={styles.icon} />
          <span className={styles.label}>Node</span>
        </button>

        <button type="button" className={styles.command} onClick={onStartConnection}>
          <LinkIcon className={styles.icon} />
          <span className={styles.label}>Connection</span>
        </button>

        <button
          type="button"
          className={styles.command}
          onClick={() => onCreateGroup('logicalGroup')}
        >
          <NetworkIcon className={styles.icon} />
          <span className={styles.label}>Group</span>
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionTitle}>Utilities</p>
        </div>

        <button type="button" className={styles.command} onClick={onOpenTheme}>
          <PaletteIcon className={styles.icon} />
          <span className={styles.label}>Theme</span>
        </button>

        <button type="button" className={styles.command} onClick={onOpenSettings}>
          <SettingsIcon className={styles.icon} />
          <span className={styles.label}>Settings</span>
        </button>
      </div>
    </aside>
  );
};
