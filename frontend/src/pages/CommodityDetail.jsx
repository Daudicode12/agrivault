import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Target,
  ShieldCheck,
  Activity,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from 'recharts';
import { marketAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import styles from './CommodityDetail.module.css';

const customTooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  fontSize: '0.8rem',
  color: '#f8fafc',
};

export default function CommodityDetail() {
  const { commodityId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [chart, setChart] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [seasonal, setSeasonal] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const searchParams = new URLSearchParams(window.location.search);
  const county = searchParams.get('county');

  useEffect(() => {
    Promise.all([
      marketAPI.analyze(commodityId).catch(() => null),
      marketAPI.chart(commodityId, { days: 90 }).catch(() => null),
      marketAPI.forecast(commodityId).catch(() => null),
      marketAPI.seasonal(commodityId).catch(() => null),
    ])
      .then(([aRes, cRes, fRes, sRes]) => {
        if (aRes?.data) {
          setAnalysis(aRes.data);
          const commodityName = aRes.data.commodityName || aRes.data.commodity_name || 'Commodity';
          document.title = `${commodityName} Analysis - AgroVault`;
        }
        if (cRes?.data) setChart(cRes.data);
        if (fRes?.data) setForecast(fRes.data);
        if (sRes?.data) setSeasonal(sRes.data);
      })
      .finally(() => setLoading(false));
  }, [commodityId]);

  useEffect(() => {
    return () => {
      document.title = 'AgroVault';
    };
  }, []);

  if (loading) return <Loader text="Analyzing commodity..." />;
  if (!analysis) {
    return (
      <div className={styles.page}>
        <Link to="/market" className={styles.back}><ArrowLeft size={16} /> Back to Market</Link>
        <Card><p className={styles.empty}>No analysis data found for this commodity.</p></Card>
      </div>
    );
  }

  const trend = analysis.trend || {};
  const rec = analysis.recommendation || {};
  const recVariant = (rec.action || '').toLowerCase().replace(/ /g, '_');
  const direction = trend.direction || 'stable';
  const DirIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  // Chart data
  const chartData = (chart?.prices || chart?.data || []).map((p) => ({
    date: new Date(p.date || p.recorded_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
    price: Number(p.price),
    sma: p.sma ? Number(p.sma) : undefined,
  }));

  // Forecast data
  const forecastData = (forecast?.predictions || forecast?.data?.predictions || []).map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
    predicted: Number(p.price),
    low: p.low ? Number(p.low) : undefined,
    high: p.high ? Number(p.high) : undefined,
  }));

  // Seasonal data
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const seasonalFactors = seasonal?.factors || seasonal?.data?.factors || {};
  const seasonalData = months.map((m, i) => ({
    month: m,
    factor: seasonalFactors[i + 1] ?? seasonalFactors[String(i + 1)] ?? 1.0,
  }));
  const currentMonth = new Date().getMonth(); // 0-indexed

  return (
    <div className={`${styles.page} fade-in`}>
      <Link to="/market" className={styles.back}><ArrowLeft size={16} /> Back to Market</Link>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          {county && (
            <div className={styles.locationTag}>
              <MapPin size={14} /> {county}
            </div>
          )}
          <h2 className={styles.commodityName}>
            {analysis.commodityName || analysis.commodity_name || 'Commodity'}
          </h2>
          <div className={styles.heroPrice}>
            <span className={styles.price}>
              KES {trend.latestPrice != null
                ? Number(trend.latestPrice).toLocaleString('en-KE', { maximumFractionDigits: 2 })
                : '—'}
            </span>
            <Badge variant={direction}><DirIcon size={14} /> {direction}</Badge>
            {trend.percentChange != null && (
              <span className={direction === 'up' ? styles.up : direction === 'down' ? styles.down : ''}>
                {trend.percentChange > 0 ? '+' : ''}{Number(trend.percentChange).toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        <Card glow className={styles.recCard}>
          <div className={styles.recHeader}>
            <ShieldCheck size={20} />
            <span>Recommendation</span>
          </div>
          <Badge variant={recVariant}>
            {(rec.action || '—').replace(/_/g, ' ')}
          </Badge>
          {rec.confidence != null && (
            <div className={styles.confBar}>
              <div className={styles.confFill} style={{ width: `${Math.round(rec.confidence * 100)}%` }} />
              <span>{Math.round(rec.confidence * 100)}% confidence</span>
            </div>
          )}
          {rec.summary && <p className={styles.recSummary}>{rec.summary}</p>}
        </Card>
      </div>

      {/* Stat row */}
      <div className={styles.statRow}>
        <StatCard icon={<Activity size={18} />} label="Volatility" value={trend.volatility != null ? `${(trend.volatility * 100).toFixed(1)}%` : '—'} />
        <StatCard icon={<Target size={18} />} label="Support" value={trend.support != null ? `KES ${Number(trend.support).toLocaleString()}` : '—'} />
        <StatCard icon={<Target size={18} />} label="Resistance" value={trend.resistance != null ? `KES ${Number(trend.resistance).toLocaleString()}` : '—'} />
        <StatCard icon={<TrendingUp size={18} />} label="Momentum" value={trend.momentum != null ? Number(trend.momentum).toFixed(2) : '—'} />
      </div>

      {/* Price History Chart */}
      {chartData.length > 0 && (
        <Card>
          <h3 className={styles.chartTitle}>Price History (90 Days)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorPrice)"
                name="Price (KES)"
              />
              {chartData[0]?.sma && (
                <Area
                  type="monotone"
                  dataKey="sma"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  name="SMA"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Forecast Chart */}
      {forecastData.length > 0 && (
        <Card>
          <h3 className={styles.chartTitle}>
            <Calendar size={18} /> Price Forecast
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area type="monotone" dataKey="high" stroke="none" fill="url(#colorBand)" name="Upper Bound" />
              <Area type="monotone" dataKey="low" stroke="none" fill="url(#colorBand)" name="Lower Bound" />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorForecast)"
                name="Predicted (KES)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Seasonal Chart */}
      <Card>
        <h3 className={styles.chartTitle}>
          <Calendar size={18} /> Seasonal Price Factors
        </h3>
        <p className={styles.chartSub}>
          Values above 1.0 indicate historically higher prices. Current month highlighted.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={seasonalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0.8, 1.3]} />
            <Tooltip contentStyle={customTooltipStyle} />
            <ReferenceLine y={1} stroke="#64748b" strokeDasharray="3 3" />
            <Bar
              dataKey="factor"
              name="Seasonal Factor"
              radius={[4, 4, 0, 0]}
              fill="#334155"
              activeBar={{ fill: '#22c55e' }}
            >
              {seasonalData.map((_, idx) => (
                <rect
                  key={idx}
                  fill={idx === currentMonth ? '#22c55e' : seasonalData[idx].factor >= 1 ? '#fbbf24' : '#64748b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Seasonal Timing Insight */}
      {seasonal?.timing && (
        <Card glow>
          <h3 className={styles.chartTitle}>Timing Insight</h3>
          <p className={styles.timingText}>{seasonal.timing.assessment || seasonal.timing}</p>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <Card className={styles.miniStat}>
      <div className={styles.miniIcon}>{icon}</div>
      <div>
        <p className={styles.miniValue}>{value}</p>
        <p className={styles.miniLabel}>{label}</p>
      </div>
    </Card>
  );
}
