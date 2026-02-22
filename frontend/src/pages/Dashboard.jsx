import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  BarChart3,
  Wheat,
  ShieldCheck,
} from 'lucide-react';
import { marketAPI, commodityAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      marketAPI.overview().catch(() => null),
      commodityAPI.list().catch(() => null),
    ])
      .then(([ovRes, comRes]) => {
        if (ovRes?.data) setOverview(ovRes.data);
        if (comRes?.data) setCommodities(comRes.data.commodities || comRes.data || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader text="Loading dashboard..." />;
  if (error) return <div className={styles.error}>Failed to load: {error}</div>;

  const summaries = overview?.commodities || overview?.data?.commodities || [];

  // Stats
  const rising = summaries.filter((c) => c.trend?.direction === 'up').length;
  const falling = summaries.filter((c) => c.trend?.direction === 'down').length;
  const holdRecs = summaries.filter(
    (c) => c.recommendation?.action === 'HOLD' || c.recommendation?.action === 'STRONG_HOLD'
  ).length;

  return (
    <div className={`${styles.page} fade-in`}>
      {/* Hero stats */}
      <div className={styles.stats}>
        <Card className={styles.stat}>
          <Wheat size={22} className={styles.statIconGreen} />
          <div>
            <p className={styles.statValue}>{commodities.length || summaries.length}</p>
            <p className={styles.statLabel}>Commodities Tracked</p>
          </div>
        </Card>
        <Card className={styles.stat}>
          <TrendingUp size={22} className={styles.statIconGreen} />
          <div>
            <p className={styles.statValue}>{rising}</p>
            <p className={styles.statLabel}>Prices Rising</p>
          </div>
        </Card>
        <Card className={styles.stat}>
          <TrendingDown size={22} className={styles.statIconRed} />
          <div>
            <p className={styles.statValue}>{falling}</p>
            <p className={styles.statLabel}>Prices Falling</p>
          </div>
        </Card>
        <Card className={styles.stat}>
          <ShieldCheck size={22} className={styles.statIconGold} />
          <div>
            <p className={styles.statValue}>{holdRecs}</p>
            <p className={styles.statLabel}>Hold Recommendations</p>
          </div>
        </Card>
      </div>

      {/* Commodity cards */}
      <h2 className={styles.sectionTitle}>
        <BarChart3 size={20} /> Market Overview
      </h2>

      {summaries.length === 0 && (
        <Card>
          <p className={styles.empty}>
            No market data available yet. Run the market engine seeder to populate data.
          </p>
        </Card>
      )}

      <div className={styles.grid}>
        {summaries.map((item) => (
          <CommodityCard key={item.commodityId || item.commodity_id} item={item} />
        ))}
      </div>
    </div>
  );
}

function CommodityCard({ item }) {
  const id = item.commodityId || item.commodity_id;
  const name = item.commodityName || item.commodity_name || item.name || 'Unknown';
  const trend = item.trend || {};
  const rec = item.recommendation || {};
  const price = trend.latestPrice ?? item.latestPrice ?? '—';
  const direction = trend.direction || 'stable';
  const pctChange = trend.percentChange ?? trend.pct_change;

  const dirIcon =
    direction === 'up' ? <TrendingUp size={16} /> :
    direction === 'down' ? <TrendingDown size={16} /> :
    <Minus size={16} />;

  const recVariant = (rec.action || '').toLowerCase().replace(/ /g, '_');

  return (
    <Link to={`/market/${id}`} className={styles.cardLink}>
      <Card className={styles.commodityCard}>
        <div className={styles.cardTop}>
          <h3 className={styles.commodityName}>{name}</h3>
          <Badge variant={direction}>{dirIcon} {direction}</Badge>
        </div>

        <p className={styles.price}>
          KES {typeof price === 'number' ? price.toLocaleString('en-KE', { maximumFractionDigits: 2 }) : price}
        </p>

        {pctChange !== undefined && pctChange !== null && (
          <p className={`${styles.change} ${direction === 'up' ? styles.changeUp : direction === 'down' ? styles.changeDown : ''}`}>
            {pctChange > 0 ? '+' : ''}{Number(pctChange).toFixed(2)}%
          </p>
        )}

        {rec.action && (
          <div className={styles.recRow}>
            <Badge variant={recVariant}>{rec.action.replace(/_/g, ' ')}</Badge>
            {rec.confidence && (
              <span className={styles.confidence}>
                {Math.round(rec.confidence * 100)}% confidence
              </span>
            )}
          </div>
        )}

        <span className={styles.viewMore}>
          View Details <ArrowRight size={14} />
        </span>
      </Card>
    </Link>
  );
}
