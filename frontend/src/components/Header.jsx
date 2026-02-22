import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import styles from './Header.module.css';

const titles = {
  '/': 'Dashboard',
  '/market': 'Market Analysis',
  '/storage': 'Storage Units',
  '/alerts': 'Alerts',
};

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const title =
    titles[pathname] ||
    (pathname.startsWith('/market/') ? 'Commodity Detail' : 'AgroVault');

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
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
