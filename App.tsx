import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import BookingWizard from './views/BookingWizard';
import AdminDashboard from './views/AdminDashboard';
import LandingPage from './views/LandingPage';
import B2BLandingPage from './views/B2BLandingPage';
import LoginPage from './views/LoginPage';
import ChatWidget from './src/components/chat/ChatWidget';
import ServiceDetailsPage from './views/ServiceDetailsPage';

// Default tenant for vegano demo
const VEGANO_TENANT_ID = 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161';

const App: React.FC = () => {
  const getInitialView = (): ViewState => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');

      if (viewParam === 'booking') return 'BOOKING';
      if (viewParam === 'b2b') return 'B2B_LANDING';
      if (viewParam === 'admin') {
        const tenantId = localStorage.getItem('tenantId');
        if (tenantId) return 'ADMIN_DASHBOARD';
        return 'ADMIN_LOGIN';
      }
      if (viewParam === 'widget') return 'CHAT_WIDGET_ONLY';
    }
    return 'LANDING';
  };

  const [view, setView] = useState<ViewState>(getInitialView);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Ensure vegano tenant is set for the booking wizard by default
  useEffect(() => {
    const storedTenant = localStorage.getItem('tenantId');
    if (!storedTenant) {
      localStorage.setItem('tenantId', VEGANO_TENANT_ID);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'booking') setView('BOOKING');
      else if (viewParam === 'b2b') setView('B2B_LANDING');
      else if (viewParam === 'admin') {
        const tenantId = localStorage.getItem('tenantId');
        setView(tenantId ? 'ADMIN_DASHBOARD' : 'ADMIN_LOGIN');
      } else if (viewParam === 'widget') {
        setView('CHAT_WIDGET_ONLY');
      } else {
        setView('LANDING');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGoHome = () => {
    try {
      window.history.pushState({}, '', window.location.pathname);
    } catch (e) {
      console.warn('History pushState failed:', e);
    }
    setView('LANDING');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    // Re-set default tenant for booking so wizard still works after logout
    localStorage.setItem('tenantId', VEGANO_TENANT_ID);
    handleGoHome();
  };

  const renderView = () => {
    switch (view) {
      case 'LANDING':
        return <LandingPage onNavigate={(target, serviceId) => {
          if (serviceId) setSelectedServiceId(serviceId);
          setView(target);
        }} />;
      case 'SERVICE_DETAILS':
        return <ServiceDetailsPage serviceId={selectedServiceId!} onNavigate={(target) => setView(target)} onBack={() => setView('LANDING')} />;
      case 'B2B_LANDING':
        return <B2BLandingPage onNavigate={(target) => setView(target)} />;
      case 'BOOKING':
        return <BookingWizard onBack={handleGoHome} />;
      case 'ADMIN_LOGIN':
        return (
          <LoginPage
            onSuccess={() => setView('ADMIN_DASHBOARD')}
            onBack={handleGoHome}
          />
        );
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard onLogout={handleLogout} />;
      default:
        return <div>Error: Vista desconocida</div>;
    }
  };

  if (view === 'CHAT_WIDGET_ONLY') {
    return <ChatWidget isEmbed={true} />;
  }

  return (
    <>
      {renderView()}
      {view !== 'ADMIN_DASHBOARD' && view !== 'ADMIN_LOGIN' && <ChatWidget />}
    </>
  );
};

export default App;