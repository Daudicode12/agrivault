import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Package,
  Warehouse,
  Bell,
  LogIn,
  Sprout,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

const publicLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/market', icon: TrendingUp, label: 'Market Analysis' },
];

const authLinks = [
  { to: '/commodities', icon: Package, label: 'Commodities' },
  { to: '/market-dashboard', icon: BarChart3, label: 'Market Dashboard' },
  { to: '/storage', icon: Warehouse, label: 'Storage Units' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
];

export default function Sidebar() {
  const { token } = useAuth();
  const location = useLocation();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Sprout size={28} className={styles.logo} />
        <span className={styles.name}>AgroVault</span>
      </div>

      <nav className={styles.nav}>
        <span className={styles.section}>Overview</span>
        {publicLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
          >
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}

        {token && (
          <>
            <span className={styles.section}>My Farm</span>
            {authLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.active : ''}`
                }
              >
                <l.icon size={18} />
                {l.label}
              </NavLink>
            ))}
          </>
        )}

        {!token && (
          <>
            <span className={styles.section}>Account</span>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <LogIn size={18} />
              Sign In
            </NavLink>
          </>
        )}
      </nav>

      <div className={styles.footer}>
        <span>AgroVault v1.0</span>
      </div>
    </aside>
  );
}
