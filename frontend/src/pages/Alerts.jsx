import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { alertAPI } from '../services/api';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import styles from './Alerts.module.css';

const typeIcons = {
  warning: <AlertTriangle size={18} />,
  critical: <XCircle size={18} />,
  info: <Info size={18} />,
};

const typeColors = {
  warning: styles.warning,
  critical: styles.critical,
  info: styles.info,
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    alertAPI
      .list()
      .then((res) => setAlerts(res.data.alerts || res.data || []))
      .catch(() => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await alertAPI.markRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true, is_read: true } : a))
      );
      toast.success('Alert marked as read');
    } catch {
      toast.error('Failed to update alert');
    }
  };

  if (loading) return <Loader text="Loading alerts..." />;

  const filtered =
    filter === 'all'
      ? alerts
      : filter === 'unread'
      ? alerts.filter((a) => !a.read && !a.is_read)
      : alerts.filter((a) => a.type === filter || a.alert_type === filter);

  const unreadCount = alerts.filter((a) => !a.read && !a.is_read).length;

  return (
    <div className={`${styles.page} fade-in`}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {['all', 'unread', 'warning', 'critical', 'info'].map((f) => (
            <button
              key={f}
              className={`${styles.tab} ${filter === f ? styles.activeTab : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'unread' ? `Unread (${unreadCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <Card>
          <div className={styles.emptyState}>
            <Bell size={40} className={styles.emptyIcon} />
            <p>No alerts to show.</p>
          </div>
        </Card>
      )}

      <div className={styles.list}>
        {filtered.map((alert) => {
          const isRead = alert.read || alert.is_read;
          const type = alert.type || alert.alert_type || 'info';
          return (
            <Card
              key={alert.id}
              className={`${styles.alertCard} ${isRead ? styles.read : ''} ${typeColors[type] || ''}`}
            >
              <div className={styles.alertIcon}>
                {typeIcons[type] || <Info size={18} />}
              </div>
              <div className={styles.alertBody}>
                <p className={styles.alertMsg}>{alert.message || alert.description}</p>
                <span className={styles.alertTime}>
                  {alert.created_at
                    ? new Date(alert.created_at).toLocaleString('en-KE')
                    : ''}
                </span>
              </div>
              {!isRead && (
                <button className={styles.readBtn} onClick={() => markRead(alert.id)}>
                  <CheckCircle size={16} />
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
