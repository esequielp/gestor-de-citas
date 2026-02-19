import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import BookingWizard from './views/BookingWizard';
import AdminDashboard from './views/AdminDashboard';
import LandingPage from './views/LandingPage';
import { Button } from './components/Button';

const App: React.FC = () => {
  // Logic to check if we should go straight to booking based on URL param
  const getInitialView = (): ViewState => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'booking') {
        return 'BOOKING';
      }
    }
    return 'LANDING';
  };

  const [view, setView] = useState<ViewState>(getInitialView);

  // Handle browser history navigation (optional polish)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'booking') setView('BOOKING');
      else setView('LANDING');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGoHome = () => {
    // Clear URL params without refreshing
    try {
      window.history.pushState({}, '', window.location.pathname);
    } catch (e) {
      console.warn("History pushState failed (likely running in restricted environment):", e);
    }
    setView('LANDING');
  };

  const renderView = () => {
    switch (view) {
      case 'LANDING':
        return <LandingPage onNavigate={(target) => setView(target)} />;
      case 'BOOKING':
        return <BookingWizard onBack={handleGoHome} />;
      case 'ADMIN_LOGIN':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Acceso Administrativo</h2>
                <p className="text-sm text-gray-500">Solo personal autorizado</p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                // Mock login
                setView('ADMIN_DASHBOARD');
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="admin" defaultValue="admin" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input type="password" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="••••" defaultValue="admin" />
                </div>
                <Button fullWidth type="submit">Entrar</Button>
                <Button fullWidth variant="secondary" type="button" onClick={handleGoHome}>Volver al Inicio</Button>
              </form>
            </div>
          </div>
        );
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard onLogout={handleGoHome} />;
      default:
        return <div>Error: Vista desconocida</div>;
    }
  };

  return (
    <>
      {renderView()}
    </>
  );
};

export default App;