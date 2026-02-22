import { useState, useEffect } from 'react';
import {
  Warehouse,
  Thermometer,
  Droplets,
  Plus,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { storageAPI, recommendationAPI, sensorAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import styles from './StorageUnits.module.css';

export default function StorageUnits() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', commodity_id: '', capacity: '' });

  const fetchUnits = () => {
    setLoading(true);
    storageAPI
      .list()
      .then((res) => setUnits(res.data.storageUnits || res.data || []))
      .catch(() => toast.error('Failed to load storage units'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUnits, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await storageAPI.create({
        ...form,
        capacity: Number(form.capacity),
      });
      toast.success('Storage unit created!');
      setCreating(false);
      setForm({ name: '', location: '', commodity_id: '', capacity: '' });
      fetchUnits();
    } catch (err) {
      toast.error(err.message || 'Failed to create');
    }
  };

  if (loading) return <Loader text="Loading storage units..." />;

  return (
    <div className={`${styles.page} fade-in`}>
      <div className={styles.toolbar}>
        <button className={styles.addBtn} onClick={() => setCreating(!creating)}>
          <Plus size={16} /> {creating ? 'Cancel' : 'Add Storage Unit'}
        </button>
      </div>

      {creating && (
        <Card className={styles.formCard}>
          <form onSubmit={handleCreate} className={styles.form}>
            <input
              placeholder="Unit Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={styles.input}
            />
            <input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={styles.input}
            />
            <input
              placeholder="Commodity ID (UUID)"
              value={form.commodity_id}
              onChange={(e) => setForm({ ...form, commodity_id: e.target.value })}
              className={styles.input}
            />
            <input
              placeholder="Capacity (kg)"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className={styles.input}
            />
            <button type="submit" className={styles.submitBtn}>Create</button>
          </form>
        </Card>
      )}

      {units.length === 0 && !creating && (
        <Card>
          <p className={styles.empty}>
            No storage units yet. Create one to start tracking your stored commodities.
          </p>
        </Card>
      )}

      <div className={styles.grid}>
        {units.map((unit) => (
          <StorageCard key={unit.id} unit={unit} />
        ))}
      </div>
    </div>
  );
}

function StorageCard({ unit }) {
  const [rec, setRec] = useState(null);
  const [sensor, setSensor] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);

  const fetchRec = () => {
    setLoadingRec(true);
    recommendationAPI
      .forUnit(unit.id)
      .then((res) => setRec(res.data))
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  };

  useEffect(() => {
    // try to fetch latest sensor data
    sensorAPI.latest(unit.id).then((res) => setSensor(res.data)).catch(() => {});
  }, [unit.id]);

  const recAction = rec?.recommendation?.action || rec?.action;
  const recSummary = rec?.recommendation?.summary || rec?.summary;
  const recVariant = (recAction || '').toLowerCase().replace(/ /g, '_');

  return (
    <Card className={styles.unitCard}>
      <div className={styles.unitHeader}>
        <Warehouse size={20} className={styles.unitIcon} />
        <div>
          <h3 className={styles.unitName}>{unit.name}</h3>
          <span className={styles.unitLocation}>{unit.location || 'No location'}</span>
        </div>
      </div>

      {/* Sensor readings */}
      {sensor && (
        <div className={styles.sensorRow}>
          <div className={styles.sensorItem}>
            <Thermometer size={14} />
            <span>{sensor.temperature ?? '—'}°C</span>
          </div>
          <div className={styles.sensorItem}>
            <Droplets size={14} />
            <span>{sensor.humidity ?? '—'}%</span>
          </div>
        </div>
      )}

      <div className={styles.meta}>
        <span>Commodity: {unit.commodity_name || unit.commodity_id || '—'}</span>
        <span>Capacity: {unit.capacity ? `${unit.capacity} kg` : '—'}</span>
      </div>

      {/* Recommendation */}
      {rec && recAction && (
        <div className={styles.recBox}>
          <Badge variant={recVariant}>{recAction.replace(/_/g, ' ')}</Badge>
          {recSummary && <p className={styles.recText}>{recSummary}</p>}
        </div>
      )}

      <button
        className={styles.recBtn}
        onClick={fetchRec}
        disabled={loadingRec}
      >
        {loadingRec ? <RefreshCw size={14} className={styles.spin} /> : <ShieldCheck size={14} />}
        {loadingRec ? 'Analyzing...' : rec ? 'Refresh' : 'Get Recommendation'}
      </button>
    </Card>
  );
}
