import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MarketAnalysis from './pages/MarketAnalysis';
import MarketDashboard from './pages/MarketDashboard';
import Commodities from './pages/Commodities';
import CommodityDetail from './pages/CommodityDetail';
import StorageUnits from './pages/StorageUnits';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        {/* public */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/market" element={<MarketAnalysis />} />
        <Route path="/market/:commodityId" element={<CommodityDetail />} />

        {/* auth required */}
        <Route
          path="/commodities"
          element={<ProtectedRoute><Commodities /></ProtectedRoute>}
        />
        <Route
          path="/market-dashboard"
          element={<ProtectedRoute><MarketDashboard /></ProtectedRoute>}
        />
        <Route
          path="/storage"
          element={<ProtectedRoute><StorageUnits /></ProtectedRoute>}
        />
        <Route
          path="/alerts"
          element={<ProtectedRoute><Alerts /></ProtectedRoute>}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
