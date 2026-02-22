import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { commodityAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import styles from './Commodities.module.css';

export default function Commodities() {
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    optimalTempMin: '',
    optimalTempMax: '',
    optimalHumidityMin: '',
    optimalHumidityMax: '',
    maxStorageDays: '',
    unit: '',
  });

  useEffect(() => {
    fetchCommodities();
  }, []);

  const fetchCommodities = async () => {
    try {
      const res = await commodityAPI.list();
      setCommodities(res.data.commodities || []);
    } catch (err) {
      toast.error('Failed to load commodities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await commodityAPI.update(editingId, formData);
        toast.success('Commodity updated successfully');
      } else {
        await commodityAPI.create(formData);
        toast.success('Commodity created successfully');
      }
      resetForm();
      fetchCommodities();
    } catch (err) {
      toast.error(err.message || 'Failed to save commodity');
    }
  };

  const handleEdit = (commodity) => {
    setFormData({
      name: commodity.name || '',
      category: commodity.category || '',
      optimalTempMin: commodity.optimalTempMin || '',
      optimalTempMax: commodity.optimalTempMax || '',
      optimalHumidityMin: commodity.optimalHumidityMin || '',
      optimalHumidityMax: commodity.optimalHumidityMax || '',
      maxStorageDays: commodity.maxStorageDays || '',
      unit: commodity.unit || '',
    });
    setEditingId(commodity.id);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await commodityAPI.delete(id);
      toast.success('Commodity deleted');
      fetchCommodities();
    } catch (err) {
      toast.error(err.message || 'Failed to delete commodity');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      optimalTempMin: '',
      optimalTempMax: '',
      optimalHumidityMin: '',
      optimalHumidityMax: '',
      maxStorageDays: '',
      unit: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <Loader text="Loading commodities..." />;

  return (
    <div className={`${styles.page} fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Package size={28} /> Commodities
        </h1>
        <button className={styles.btnPrimary} onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Add Commodity
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h2>{editingId ? 'Edit Commodity' : 'New Commodity'}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Maize"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  <option value="Grain">Grain</option>
                  <option value="Legume">Legume</option>
                  <option value="Tuber">Tuber</option>
                  <option value="Cash Crop">Cash Crop</option>
                  <option value="Vegetable">Vegetable</option>
                  <option value="Fruit">Fruit</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., bag (90kg), kg"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Max Storage Days</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxStorageDays}
                  onChange={(e) => setFormData({ ...formData, maxStorageDays: e.target.value })}
                  placeholder="e.g., 365"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Optimal Temp Min (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.optimalTempMin}
                  onChange={(e) => setFormData({ ...formData, optimalTempMin: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Optimal Temp Max (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.optimalTempMax}
                  onChange={(e) => setFormData({ ...formData, optimalTempMax: e.target.value })}
                  placeholder="e.g., 15"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Optimal Humidity Min (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.optimalHumidityMin}
                  onChange={(e) => setFormData({ ...formData, optimalHumidityMin: e.target.value })}
                  placeholder="e.g., 12"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Optimal Humidity Max (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.optimalHumidityMax}
                  onChange={(e) => setFormData({ ...formData, optimalHumidityMax: e.target.value })}
                  placeholder="e.g., 14"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                {editingId ? 'Update' : 'Create'} Commodity
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className={styles.grid}>
        {commodities.map((commodity) => (
          <Card key={commodity.id} className={styles.commodityCard}>
            <div className={styles.cardHeader}>
              <h3>{commodity.name}</h3>
              <Badge variant="info">{commodity.category || 'Uncategorized'}</Badge>
            </div>

            <div className={styles.cardBody}>
              {commodity.unit && (
                <div className={styles.detail}>
                  <span>Unit:</span>
                  <strong>{commodity.unit}</strong>
                </div>
              )}

              {commodity.optimalTempMin && commodity.optimalTempMax && (
                <div className={styles.detail}>
                  <span>Temperature:</span>
                  <strong>{commodity.optimalTempMin}°C - {commodity.optimalTempMax}°C</strong>
                </div>
              )}

              {commodity.optimalHumidityMin && commodity.optimalHumidityMax && (
                <div className={styles.detail}>
                  <span>Humidity:</span>
                  <strong>{commodity.optimalHumidityMin}% - {commodity.optimalHumidityMax}%</strong>
                </div>
              )}

              {commodity.maxStorageDays && (
                <div className={styles.detail}>
                  <span>Max Storage:</span>
                  <strong>{commodity.maxStorageDays} days</strong>
                </div>
              )}
            </div>

            <div className={styles.cardActions}>
              <button
                className={styles.btnIcon}
                onClick={() => handleEdit(commodity)}
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                className={`${styles.btnIcon} ${styles.btnDanger}`}
                onClick={() => handleDelete(commodity.id, commodity.name)}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {commodities.length === 0 && (
        <Card className={styles.empty}>
          <Package size={48} />
          <p>No commodities yet</p>
          <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Your First Commodity
          </button>
        </Card>
      )}
    </div>
  );
}
