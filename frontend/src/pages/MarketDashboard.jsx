import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, MapPin, Package, Calendar } from 'lucide-react';
import { commodityAPI, marketAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loader from '../components/ui/Loader';
import styles from './MarketDashboard.module.css';

const COUNTIES = [
  'All Counties',
  'Nairobi',
  'Kiambu',
  'Nakuru',
  'Mombasa',
  'Kisumu',
  'Uasin Gishu',
  'Machakos',
];

export default function MarketDashboard() {
  const [commodities, setCommodities] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('All Counties');
  const [days, setDays] = useState(90);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    commodityAPI.list().then((res) => {
      const list = res.data.commodities || [];
      setCommodities(list);
      if (list.length > 0) setSelectedCommodity(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedCommodity) return;
    fetchDashboard();
  }, [selectedCommodity, selectedCounty, days]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { commodityId: selectedCommodity, days };
      if (selectedCounty !== 'All Counties') params.county = selectedCounty;
      
      const res = await marketAPI.dashboard(params);
      setDashboard(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (commodities.length === 0) return <Loader text="Loading commodities..." />;

  const chartData = dashboard?.priceHistory?.map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    price: p.price,
    market: p.market,
  })) || [];

  const rec = dashboard?.recommendation;
  const recColor = rec?.action === 'SELL' || rec?.action === 'CONSIDER_SELLING' ? 'danger' : 'success';

  return (
    <div className={`${styles.page} fade-in`}>
      <h1 className={styles.title}>Market Dashboard</h1>

      {/* Filters */}
      <Card className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>
            <Package size={16} /> Commodity
          </label>
          <select value={selectedCommodity} onChange={(e) => setSelectedCommodity(e.target.value)}>
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <MapPin size={16} /> County
          </label>
          <select value={selectedCounty} onChange={(e) => setSelectedCounty(e.target.value)}>
            {COUNTIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <Calendar size={16} /> Period
          </label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
      </Card>

      {loading && <Loader text="Analyzing market data..." />}
      {error && <Card className={styles.error}>{error}</Card>}

      {dashboard?.status === 'insufficient_data' && (
        <Card className={styles.warning}>
          <p>{dashboard.message}</p>
          <p>Try selecting "All Counties" or a different time period.</p>
        </Card>
      )}

      {dashboard?.status === 'ok' && (
        <>
          {/* Price Summary */}
          <div className={styles.grid}>
            <Card className={styles.statCard}>
              <div className={styles.statLabel}>Current Price</div>
              <div className={styles.statValue}>
                KES {dashboard.priceSummary.current.toLocaleString()}
              </div>
              <div className={styles.statMeta}>{dashboard.priceSummary.currentMarket}</div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statLabel}>Average Price</div>
              <div className={styles.statValue}>
                KES {dashboard.priceSummary.average.toLocaleString()}
              </div>
              <div className={styles.statMeta}>{days} days</div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statLabel}>Price Range</div>
              <div className={styles.statValue}>
                {dashboard.priceSummary.minimum.toLocaleString()} - {dashboard.priceSummary.maximum.toLocaleString()}
              </div>
              <div className={styles.statMeta}>Min - Max</div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statLabel}>Data Points</div>
              <div className={styles.statValue}>{dashboard.dataPoints}</div>
              <div className={styles.statMeta}>{dashboard.county}</div>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className={`${styles.recommendation} ${styles[recColor]}`}>
            <div className={styles.recHeader}>
              <h2>{rec.action.replace(/_/g, ' ')}</h2>
              <Badge variant={rec.urgency}>{rec.urgency} urgency</Badge>
            </div>
            <p className={styles.recSummary}>{rec.summary}</p>
            <div className={styles.recMeta}>
              <span>Confidence: {rec.confidence}</span>
              <span>Score: {rec.compositeScore}</span>
            </div>
          </Card>

          {/* Price Chart */}
          <Card className={styles.chartCard}>
            <h3>Price Trend - {dashboard.commodity.name}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`KES ${value.toLocaleString()}`, 'Price']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Analysis Details */}
          <div className={styles.grid}>
            {/* Trend */}
            <Card>
              <h3>
                {dashboard.analysis.trend.direction === 'rising' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {' '}Trend Analysis
              </h3>
              <div className={styles.analysisList}>
                <div className={styles.analysisItem}>
                  <span>Direction:</span>
                  <Badge variant={dashboard.analysis.trend.direction}>
                    {dashboard.analysis.trend.direction}
                  </Badge>
                </div>
                <div className={styles.analysisItem}>
                  <span>7-day momentum:</span>
                  <strong>{dashboard.analysis.trend.momentum['7day']?.toFixed(2)}%</strong>
                </div>
                <div className={styles.analysisItem}>
                  <span>14-day momentum:</span>
                  <strong>{dashboard.analysis.trend.momentum['14day']?.toFixed(2)}%</strong>
                </div>
                <div className={styles.analysisItem}>
                  <span>Volatility:</span>
                  <strong>{dashboard.analysis.trend.volatility.dailyVolatility?.toFixed(2)}%</strong>
                </div>
              </div>
            </Card>

            {/* Forecast */}
            {dashboard.analysis.forecast && (
              <Card>
                <h3>Price Forecast (30 days)</h3>
                <div className={styles.analysisList}>
                  <div className={styles.analysisItem}>
                    <span>Direction:</span>
                    <Badge variant={dashboard.analysis.forecast.direction}>
                      {dashboard.analysis.forecast.direction.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className={styles.analysisItem}>
                    <span>Expected change:</span>
                    <strong>{dashboard.analysis.forecast.priceChangePct?.toFixed(2)}%</strong>
                  </div>
                  <div className={styles.analysisItem}>
                    <span>Reliability:</span>
                    <Badge variant={dashboard.analysis.forecast.reliability}>
                      {dashboard.analysis.forecast.reliability}
                    </Badge>
                  </div>
                </div>
              </Card>
            )}

            {/* Seasonal */}
            <Card>
              <h3>Seasonal Patterns</h3>
              <div className={styles.analysisList}>
                <div className={styles.analysisItem}>
                  <span>Current month:</span>
                  <strong>{dashboard.analysis.seasonal.currentMonth}</strong>
                </div>
                <div className={styles.analysisItem}>
                  <span>Signal:</span>
                  <Badge variant={dashboard.analysis.seasonal.seasonalSignal}>
                    {dashboard.analysis.seasonal.seasonalSignal.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className={styles.analysisItem}>
                  <span>Next peak:</span>
                  <strong>
                    {dashboard.analysis.seasonal.nextPeakMonth} 
                    ({dashboard.analysis.seasonal.monthsUntilPeak} months)
                  </strong>
                </div>
              </div>
            </Card>
          </div>

          {/* Reasoning */}
          <Card>
            <h3>Recommendation Reasoning</h3>
            <div className={styles.reasoning}>
              {rec.reasoning.trend.length > 0 && (
                <div className={styles.reasonSection}>
                  <h4>Trend Factors:</h4>
                  <ul>
                    {rec.reasoning.trend.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {rec.reasoning.forecast.length > 0 && (
                <div className={styles.reasonSection}>
                  <h4>Forecast Factors:</h4>
                  <ul>
                    {rec.reasoning.forecast.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {rec.reasoning.seasonal.length > 0 && (
                <div className={styles.reasonSection}>
                  <h4>Seasonal Factors:</h4>
                  <ul>
                    {rec.reasoning.seasonal.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
