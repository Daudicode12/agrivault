import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Menu } from 'lucide-react';
import styles from './Header.module.css';

const titles = {
  '/': 'Dashboard',
  '/market': 'Market Analysis',
  '/storage': 'Storage Units',
  '/alerts': 'Alerts',
  '/commodities': 'Commodities',
  '/market-dashboard': 'Market Dashboard',
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const getTitle = () => {
    if (titles[pathname]) return titles[pathname];
    if (pathname.startsWith('/market/')) {
      return document.title.replace(' - AgroVault', '') || 'Commodity Analysis';
    }
    return 'AgroVault';
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <h1 className={styles.title}>{getTitle()}</h1>
      </div>
      <div className={styles.right}>
        {user && (
          <>
            <div className={styles.user}>
              <User size={16} />
              <span>{user.name || user.email}</span>
            </div>
            <button className={styles.logout} onClick={logout}>
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
