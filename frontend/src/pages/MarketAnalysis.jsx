import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Search, ArrowRight, Package } from 'lucide-react';
import { marketAPI, commodityAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import styles from './MarketAnalysis.module.css';

export default function MarketAnalysis() {
  const [marketData, setMarketData] = useState(null);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      marketAPI.overview().catch(() => null),
      commodityAPI.list().catch(() => null),
    ])
      .then(([marketRes, commodityRes]) => {
        if (marketRes?.data) setMarketData(marketRes.data);
        if (commodityRes?.data) setCommodities(commodityRes.data.commodities || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader text="Analyzing markets..." />;

  // Use market data if available, otherwise use commodities list
  const marketCommodities = marketData?.commodities || marketData?.data?.commodities || [];
  const displayList = marketCommodities.length > 0 ? marketCommodities : commodities;
  
  const filtered = displayList.filter((c) => {
    const name = (c.commodityName || c.commodity_name || c.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className={`${styles.page} fade-in`}>
      {/* Search bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search commodities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.count}>{filtered.length} commodities</span>
      </div>

      {/* Table-like list */}
      <Card className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.colName}>Commodity</span>
          <span className={styles.colPrice}>Price (KES)</span>
          <span className={styles.colTrend}>Trend</span>
          <span className={styles.colVolatility}>Volatility</span>
          <span className={styles.colRec}>Recommendation</span>
          <span className={styles.colAction}></span>
        </div>

        {filtered.length === 0 && commodities.length === 0 && (
          <div className={styles.emptyState}>
            <Package size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>No commodities available.</p>
            <Link to="/commodities" className={styles.emptyLink}>
              Add Commodities <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {filtered.length === 0 && commodities.length > 0 && (
          <p className={styles.empty}>No commodities match your search.</p>
        )}

        {filtered.map((item) => {
          const id = item.commodityId || item.commodity_id || item.id;
          const name = item.commodityName || item.commodity_name || item.name;
          const trend = item.trend || {};
          const rec = item.recommendation || {};
          const latestPrice = trend.latestPrice ?? item.latestPrice;
          const direction = trend.direction || 'stable';
          const vol = trend.volatility;
          const pct = trend.percentChange ?? trend.pct_change;
          const recAction = rec.action || (marketCommodities.length > 0 ? '—' : 'View');
          const recVariant = recAction.toLowerCase().replace(/ /g, '_');

          const DirIcon =
            direction === 'up' ? TrendingUp :
            direction === 'down' ? TrendingDown : Minus;

          return (
            <Link key={id} to={`/market/${id}`} className={styles.row}>
              <span className={styles.colName}>
                <strong>{name}</strong>
              </span>

              <span className={styles.colPrice}>
                {latestPrice != null
                  ? Number(latestPrice).toLocaleString('en-KE', { maximumFractionDigits: 2 })
                  : '—'}
                {pct != null && (
                  <small className={direction === 'up' ? styles.up : direction === 'down' ? styles.down : ''}>
                    {' '}{pct > 0 ? '+' : ''}{Number(pct).toFixed(1)}%
                  </small>
                )}
              </span>

              <span className={styles.colTrend}>
                <Badge variant={direction}>
                  <DirIcon size={14} /> {direction}
                </Badge>
              </span>

              <span className={styles.colVolatility}>
                {vol != null ? `${(vol * 100).toFixed(1)}%` : '—'}
              </span>

              <span className={styles.colRec}>
                <Badge variant={recVariant}>{recAction.replace(/_/g, ' ')}</Badge>
              </span>

              <span className={styles.colAction}>
                <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
