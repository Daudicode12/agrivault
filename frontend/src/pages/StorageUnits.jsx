import { useState, useEffect } from 'react';
import {
  Warehouse,
  Thermometer,
  Droplets,
  Plus,
  Edit2,
  ShieldCheck,
  RefreshCw,
  Cloud,
  Wind,
  AlertTriangle,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  MapPin,
} from 'lucide-react';
import { storageAPI, recommendationAPI, sensorAPI, commodityAPI, weatherAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import styles from './StorageUnits.module.css';

export default function StorageUnits() {
  const [units, setUnits] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', commodityId: '', capacityKg: '', currentStockKg: '' });

  useEffect(() => {
    // Fetch commodities for dropdown
    commodityAPI.list().then((res) => {
      setCommodities(res.data.commodities || []);
    });
    fetchUnits();
  }, []);

  const fetchUnits = () => {
    setLoading(true);
    storageAPI
      .list()
      .then((res) => setUnits(res.data.storageUnits || res.data || []))
      .catch(() => toast.error('Failed to load storage units'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        location: form.location,
        commodityId: form.commodityId,
        capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
        currentStockKg: form.currentStockKg ? Number(form.currentStockKg) : undefined,
      };

      if (editingId) {
        await storageAPI.update(editingId, payload);
        toast.success('Storage unit updated!');
      } else {
        await storageAPI.create(payload);
        toast.success('Storage unit created!');
      }
      
      resetForm();
      fetchUnits();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleEdit = (unit) => {
    setForm({
      name: unit.name || '',
      location: unit.location || '',
      commodityId: unit.commodityId || '',
      capacityKg: unit.capacityKg || '',
      currentStockKg: unit.currentStockKg || '',
    });
    setEditingId(unit.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name: '', location: '', commodityId: '', capacityKg: '', currentStockKg: '' });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <Loader text="Loading storage units..." />;

  return (
    <div className={`${styles.page} fade-in`}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>
          <Warehouse size={28} /> Storage Units
        </h1>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add Storage Unit'}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h2>{editingId ? 'Edit Storage Unit' : 'New Storage Unit'}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  placeholder="e.g., Barn A"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Location</label>
                <input
                  placeholder="e.g., North Field"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Commodity</label>
                <select
                  value={form.commodityId}
                  onChange={(e) => setForm({ ...form, commodityId: e.target.value })}
                >
                  <option value="">Select commodity</option>
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Capacity (kg)</label>
                <input
                  type="number"
                  placeholder="e.g., 5000"
                  value={form.capacityKg}
                  onChange={(e) => setForm({ ...form, capacityKg: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Current Stock (kg)</label>
                <input
                  type="number"
                  placeholder="e.g., 3200"
                  value={form.currentStockKg}
                  onChange={(e) => setForm({ ...form, currentStockKg: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                {editingId ? 'Update' : 'Create'} Storage Unit
              </button>
            </div>
          </form>
        </Card>
      )}

      {units.length === 0 && !showForm && (
        <Card>
          <p className={styles.empty}>
            No storage units yet. Create one to start tracking your stored commodities.
          </p>
        </Card>
      )}

      <div className={styles.grid}>
        {units.map((unit) => (
          <StorageCard key={unit.id} unit={unit} onEdit={handleEdit} />
        ))}
      </div>
    </div>
  );
}

function StorageCard({ unit, onEdit }) {
  const [rec, setRec] = useState(null);
  const [sensor, setSensor] = useState(null);
  const [weather, setWeather] = useState(null);
  const [storageRisk, setStorageRisk] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const fetchRec = () => {
    setLoadingRec(true);
    recommendationAPI
      .forUnit(unit.id)
      .then((res) => setRec(res.data))
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  };

  const fetchWeather = () => {
    if (!unit.location) return;
    setLoadingWeather(true);
    weatherAPI
      .forStorage(unit.id)
      .then((res) => {
        setWeather(res.data.weather);
        setStorageRisk(res.data.storageRisk);
      })
      .catch(() => {})
      .finally(() => setLoadingWeather(false));
  };

  useEffect(() => {
    sensorAPI.latest(unit.id).then((res) => setSensor(res.data)).catch(() => {});
    // Auto-fetch weather if location is set
    if (unit.location) fetchWeather();
  }, [unit.id]);

  const recAction = rec?.recommendation?.action || rec?.action;
  const recSummary = rec?.recommendation?.summary || rec?.summary;
  const recVariant = (recAction || '').toLowerCase().replace(/ /g, '_');

  const getWeatherIcon = (condition) => {
    if (!condition) return <Cloud size={14} />;
    const c = condition.toLowerCase();
    if (c.includes('clear') || c.includes('sunny')) return <Sun size={14} />;
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return <CloudRain size={14} />;
    if (c.includes('snow')) return <CloudSnow size={14} />;
    if (c.includes('thunder')) return <CloudLightning size={14} />;
    return <Cloud size={14} />;
  };

  const getRiskBadgeVariant = (risk) => {
    if (risk === 'critical') return 'danger';
    if (risk === 'warning') return 'warning';
    if (risk === 'info') return 'info';
    return 'success';
  };

  return (
    <Card className={styles.unitCard}>
      <div className={styles.unitHeader}>
        <div className={styles.unitHeaderLeft}>
          <Warehouse size={20} className={styles.unitIcon} />
          <div>
            <h3 className={styles.unitName}>{unit.name}</h3>
            <span className={styles.unitLocation}>
              <MapPin size={12} /> {unit.location || 'No location set'}
            </span>
          </div>
        </div>
        <button
          className={styles.editBtn}
          onClick={() => onEdit(unit)}
          title="Edit storage unit"
        >
          <Edit2 size={16} />
        </button>
      </div>

      {/* Weather Section */}
      {weather?.current && (
        <div className={styles.weatherSection}>
          <div className={styles.weatherHeader}>
            {getWeatherIcon(weather.current.condition)}
            <span className={styles.weatherCondition}>{weather.current.condition}</span>
          </div>
          <div className={styles.weatherGrid}>
            <div className={styles.weatherItem}>
              <Thermometer size={13} />
              <span>{weather.current.temperature?.toFixed(1)}°C</span>
            </div>
            <div className={styles.weatherItem}>
              <Droplets size={13} />
              <span>{weather.current.humidity}%</span>
            </div>
            <div className={styles.weatherItem}>
              <Wind size={13} />
              <span>{weather.current.windSpeed?.toFixed(1)} km/h</span>
            </div>
            {weather.current.precipitation > 0 && (
              <div className={styles.weatherItem}>
                <CloudRain size={13} />
                <span>{weather.current.precipitation}mm</span>
              </div>
            )}
          </div>

          {/* Storage Risk Assessment */}
          {storageRisk && (
            <div className={styles.riskSection}>
              <Badge variant={getRiskBadgeVariant(storageRisk.overallRisk)}>
                {storageRisk.overallRisk === 'good' ? '✓ Good conditions' : 
                 storageRisk.overallRisk === 'critical' ? '⚠ Critical risk' :
                 storageRisk.overallRisk === 'warning' ? '⚡ Warning' : 'ℹ Info'}
              </Badge>
              {storageRisk.risks.length > 0 && (
                <ul className={styles.riskList}>
                  {storageRisk.risks.slice(0, 3).map((r, i) => (
                    <li key={i} className={styles[`risk_${r.severity}`]}>
                      <AlertTriangle size={12} /> {r.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 3-day Forecast */}
          {weather.forecast && weather.forecast.length > 0 && (
            <div className={styles.forecastRow}>
              {weather.forecast.slice(0, 3).map((day, i) => (
                <div key={i} className={styles.forecastDay}>
                  <span className={styles.forecastDate}>
                    {new Date(day.date).toLocaleDateString('en-KE', { weekday: 'short' })}
                  </span>
                  {getWeatherIcon(day.condition)}
                  <span className={styles.forecastTemp}>
                    {day.tempMax?.toFixed(0)}° / {day.tempMin?.toFixed(0)}°
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!weather && unit.location && loadingWeather && (
        <div className={styles.weatherLoading}>
          <RefreshCw size={14} className={styles.spin} /> Loading weather...
        </div>
      )}

      {!weather && unit.location && !loadingWeather && (
        <button className={styles.weatherBtn} onClick={fetchWeather}>
          <Cloud size={14} /> Load Weather
        </button>
      )}

      {!unit.location && (
        <div className={styles.noLocation}>
          <MapPin size={14} /> Set a location to see weather conditions
        </div>
      )}

      {/* Sensor readings */}
      {sensor && (
        <div className={styles.sensorRow}>
          <div className={styles.sensorItem}>
            <Thermometer size={14} />
            <span>Sensor: {sensor.temperature ?? '—'}°C</span>
          </div>
          <div className={styles.sensorItem}>
            <Droplets size={14} />
            <span>Sensor: {sensor.humidity ?? '—'}%</span>
          </div>
        </div>
      )}

      <div className={styles.meta}>
        <span>Commodity: {unit.commodity?.name || '—'}</span>
        <span>Capacity: {unit.capacityKg ? `${unit.capacityKg} kg` : '—'}</span>
        {unit.currentStockKg && <span>Stock: {unit.currentStockKg} kg</span>}
      </div>

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
