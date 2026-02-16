import React, { useState } from 'react';
import { ViewState } from './types';
import BookingWizard from './views/BookingWizard';
import AdminDashboard from './views/AdminDashboard';
import { Home, Calendar, Lock } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');

  const renderView = () => {
    switch (view) {
      case 'LANDING':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-8 animate-fade-in-up">
              <div className="space-y-2">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">GestorCitas Pro</h1>
                <p className="text-gray-500">Reserva tu cita en segundos. Simple, rápido y eficiente.</p>
              </div>

              <div className="space-y-4">
                <Button 
                  fullWidth 
                  variant="primary" 
                  onClick={() => setView('BOOKING')}
                  className="h-12 text-lg"
                >
                  Reservar Cita
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Administración</span>
                  </div>
                </div>

                <Button 
                  fullWidth 
                  variant="secondary" 
                  onClick={() => setView('ADMIN_LOGIN')}
                  className="h-12 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Acceso Admin
                </Button>
              </div>
            </div>
            <p className="mt-8 text-white/60 text-sm">© 2024 GestorCitas Pro. MVP Demo.</p>
          </div>
        );
      case 'BOOKING':
        return <BookingWizard onBack={() => setView('LANDING')} />;
      case 'ADMIN_LOGIN':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h2>
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
                <Button fullWidth variant="secondary" type="button" onClick={() => setView('LANDING')}>Cancelar</Button>
              </form>
            </div>
          </div>
        );
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard onLogout={() => setView('LANDING')} />;
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
