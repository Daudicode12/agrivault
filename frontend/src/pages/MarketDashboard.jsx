import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, MapPin, Package, Calendar, Target, Activity } from 'lucide-react';
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
      if (list.length > 0) setSelectedCommodity(list[0].name);
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
      const params = { commodity: selectedCommodity, days };
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
              <option key={c.id} value={c.name}>{c.name}</option>
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
          {/* Data Source Indicator */}
          <Card className={styles.dataSourceBanner}>
            <div className={styles.bannerContent}>
              <span className={styles.bannerIcon}>📊</span>
              <div>
                <strong>Price Data Source:</strong> Showing prices sourced from KNBS (Kenya National Bureau of Statistics) 
                and verified market data. {dashboard.dataPoints} data points 
                {dashboard.county !== 'All counties' ? ` for ${dashboard.county}` : ''}.
              </div>
            </div>
          </Card>
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
              <div className={styles.statLabel}>Volatility</div>
              <div className={styles.statValue}>
                {dashboard.analysis?.trend?.volatility?.dailyVolatility 
                  ? `${dashboard.analysis.trend.volatility.dailyVolatility.toFixed(2)}%`
                  : 'N/A'}
              </div>
              <div className={styles.statMeta}>Daily</div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statLabel}>
                <Target size={16} /> Support Level
              </div>
              <div className={styles.statValue}>
                {dashboard.analysis?.trend?.priceRange?.low 
                  ? `KES ${dashboard.analysis.trend.priceRange.low.toLocaleString()}`
                  : 'N/A'}
              </div>
              <div className={styles.statMeta}>Floor price</div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statLabel}>
                <Target size={16} /> Resistance Level
              </div>
              <div className={styles.statValue}>
                {dashboard.analysis?.trend?.priceRange?.high 
                  ? `KES ${dashboard.analysis.trend.priceRange.high.toLocaleString()}`
                  : 'N/A'}
              </div>
              <div className={styles.statMeta}>Ceiling price</div>
            </Card>
          </div>

          {/* Recommendation */}
          {rec && (
            <Card className={`${styles.recommendation} ${styles[recColor]}`}>
              <div className={styles.recHeader}>
                <h2>{rec.action?.replace(/_/g, ' ') || 'HOLD'}</h2>
                <Badge variant={rec.urgency || 'low'}>{rec.urgency || 'low'} urgency</Badge>
              </div>
              <p className={styles.recSummary}>{rec.summary || 'Analyzing market conditions...'}</p>
              <div className={styles.recMeta}>
                <span>Confidence: {rec.confidence || 'N/A'}</span>
                <span>Score: {rec.compositeScore?.toFixed(2) || 'N/A'}</span>
              </div>
            </Card>
          )}

          {/* Price Chart */}
          <Card className={styles.chartCard}>
            <h3>Price Trend - {dashboard.commodity.name}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => [`KES ${value.toLocaleString()}`, 'Price']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#22c55e' }}
                  activeDot={{ r: 5 }}
                  name="Price (KES)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Seasonal Bar Chart */}
          <Card className={styles.chartCard}>
            <h3>Seasonal Price Patterns</h3>
            <p className={styles.chartSub}>Monthly price factors - values above 1.0 indicate higher prices</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { month: 'Jan', factor: dashboard.analysis.seasonal.allFactors?.January || 1 },
                { month: 'Feb', factor: dashboard.analysis.seasonal.allFactors?.February || 1 },
                { month: 'Mar', factor: dashboard.analysis.seasonal.allFactors?.March || 1 },
                { month: 'Apr', factor: dashboard.analysis.seasonal.allFactors?.April || 1 },
                { month: 'May', factor: dashboard.analysis.seasonal.allFactors?.May || 1 },
                { month: 'Jun', factor: dashboard.analysis.seasonal.allFactors?.June || 1 },
                { month: 'Jul', factor: dashboard.analysis.seasonal.allFactors?.July || 1 },
                { month: 'Aug', factor: dashboard.analysis.seasonal.allFactors?.August || 1 },
                { month: 'Sep', factor: dashboard.analysis.seasonal.allFactors?.September || 1 },
                { month: 'Oct', factor: dashboard.analysis.seasonal.allFactors?.October || 1 },
                { month: 'Nov', factor: dashboard.analysis.seasonal.allFactors?.November || 1 },
                { month: 'Dec', factor: dashboard.analysis.seasonal.allFactors?.December || 1 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0.8, 1.3]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => [value.toFixed(2), 'Factor']}
                />
                <ReferenceLine y={1} stroke="#64748b" strokeDasharray="3 3" />
                <Bar dataKey="factor" fill="#22c55e" radius={[4, 4, 0, 0]} name="Seasonal Factor" />
              </BarChart>
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
                  <strong>
                    {dashboard.analysis?.trend?.momentum?.['7day'] != null
                      ? `${dashboard.analysis.trend.momentum['7day'].toFixed(2)}%`
                      : 'N/A'}
                  </strong>
                </div>
                <div className={styles.analysisItem}>
                  <span>14-day momentum:</span>
                  <strong>
                    {dashboard.analysis?.trend?.momentum?.['14day'] != null
                      ? `${dashboard.analysis.trend.momentum['14day'].toFixed(2)}%`
                      : 'N/A'}
                  </strong>
                </div>
                <div className={styles.analysisItem}>
                  <span>Volatility:</span>
                  <strong>
                    {dashboard.analysis?.trend?.volatility?.dailyVolatility != null
                      ? `${dashboard.analysis.trend.volatility.dailyVolatility.toFixed(2)}%`
                      : 'N/A'}
                  </strong>
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
