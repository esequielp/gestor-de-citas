import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import BookingWizard from './views/BookingWizard';
import AdminDashboard from './views/AdminDashboard';
import { Lock, Scissors } from 'lucide-react';
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
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600 rounded-b-[50%] scale-x-150 z-0"></div>

            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-8 animate-fade-in-up z-10 relative mt-10">
              <div className="space-y-2">
                <div className="bg-white p-2 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 -mt-16 shadow-lg">
                  <div className="bg-indigo-100 w-full h-full rounded-full flex items-center justify-center">
                     <Scissors className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Estilo & Clase</h1>
                <p className="text-gray-500">Agenda tu próxima sesión de belleza con nosotros en segundos.</p>
              </div>

              <div className="space-y-4 pt-4">
                <Button 
                  fullWidth 
                  variant="primary" 
                  onClick={() => setView('BOOKING')}
                  className="h-14 text-lg shadow-indigo-200"
                >
                  Reservar Cita Ahora
                </Button>
                
                <p className="text-xs text-gray-400 pt-4">
                  Horario de atención: Lun-Sáb 08:00 - 17:00
                </p>
              </div>
            </div>

            {/* Discreet Admin Footer */}
            <div className="mt-12 z-10">
               <button 
                 onClick={() => setView('ADMIN_LOGIN')}
                 className="text-gray-400 text-xs hover:text-indigo-600 flex items-center gap-1 transition-colors"
               >
                 <Lock className="w-3 h-3" /> Acceso Personal
               </button>
            </div>
          </div>
        );
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