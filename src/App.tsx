import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import RefundPolicy from './components/legal/RefundPolicy';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">טוען נתונים...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        isAuthenticated ? (
          user?.businessName === "My Business" || user?.businessName === "הקפה של ירדן"
            ? <Onboarding onComplete={() => window.location.reload()} />
            : <Dashboard onLogout={() => window.location.reload()} />
        ) : <Navigate to="/login" replace />
      } />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
