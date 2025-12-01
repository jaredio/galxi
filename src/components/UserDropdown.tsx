import { useState } from 'react';
import styles from './Topbar.module.css';

type UserDropdownProps = {
  name: string;
  onLogout: () => void;
};

export const UserDropdown = ({ name, onLogout }: UserDropdownProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.triggerGroup}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerActive : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {name} ▾
      </button>
      {open && (
        <div className={styles.dropdown}>
          <button type="button" className={styles.dropdownItem} onClick={() => setOpen(false)}>
            Account
          </button>
          <button type="button" className={styles.dropdownItem} onClick={() => setOpen(false)}>
            Settings
          </button>
          <div className={styles.dropdownDivider} />
          <button
            type="button"
            className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
