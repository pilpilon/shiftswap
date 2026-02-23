import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import RefundPolicy from './components/legal/RefundPolicy';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, isAuthenticated, login } = useAuth();

  return (
    <Routes>
      <Route path="/" element={
        !isAuthenticated ? <LandingPage onLogin={() => login("ישראל ישראלי", "הקפה של ירדן")} /> :
          user?.businessName === "הקפה של ירדן" ? <Onboarding onComplete={() => login(user.name, "העסק הוגדר")} /> :
            <Dashboard onLogout={() => window.location.reload()} />
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
