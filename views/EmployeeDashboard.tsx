import React, { useState, useEffect } from 'react';
import { Calendar, MessageSquare, LogOut, CheckCircle, Clock, MapPin, Search, Filter } from 'lucide-react';
import { Button } from '../components/Button';
import { dataService } from '../services/dataService';
import { Appointment, Employee } from '../types';

interface Props {
    onLogout: () => void;
}

const EmployeeDashboard: React.FC<Props> = ({ onLogout }) => {
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'AGENDA' | 'MESSAGES'>('AGENDA');

    useEffect(() => {
        // En un MVP real, aquí obtendríamos el empleado asociado al usuario logueado en Supabase Auth
        // Para este prototipo, simularemos que carga las citas del primer empleado encontrado de la empresa
        const fetchEmployeeData = async () => {
            try {
                // Mock: Obtener lista de empleados y tomar el primero como "yo"
                const empList = await dataService.getEmployees();
                if (empList.length > 0) {
                    setEmployee(empList[0]);
                    const allAppts = await dataService.getAppointments();
                    // Filtrar solo las mías
                    const myAppts = allAppts.filter(a => a.employeeId === empList[0].id);
                    setAppointments(myAppts);
                }
            } catch (err) {
                console.error("Error cargando dashboard de empleado", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeData();
    }, []);

    const formatTime12h = (mins: number | null): string => {
        if (mins === null) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Sidebar Empleado */}
            <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
                <div className="p-6 pb-2 border-b border-gray-100 flex-1">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md mx-auto mb-4 overflow-hidden">
                        {employee?.avatarUrl || employee?.avatar ? (
                            <img src={employee.avatarUrl || employee.avatar} alt="Perfil" className="w-full h-full object-cover" />
                        ) : employee?.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center">
                        <h2 className="font-bold text-gray-900">{employee?.name || 'Profesional'}</h2>
                        <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-full">{employee?.roleLabel || 'Especialista'}</span>
                    </div>

                    <div className="mt-8 space-y-2">
                        <button
                            onClick={() => setActiveTab('AGENDA')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'AGENDA' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                        >
                            <Calendar size={20} /> Mi Agenda
                        </button>
                        <button
                            onClick={() => setActiveTab('MESSAGES')}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'MESSAGES' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                        >
                            <div className="flex gap-3 items-center"><MessageSquare size={20} /> Mensajes</div>
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">2</span>
                        </button>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-500 hover:bg-red-50 p-3 rounded-lg transition-colors font-medium">
                        <LogOut size={18} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Mobile Nav */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">{employee?.name.charAt(0)}</div>
                    <span className="font-bold text-gray-900">Portal Staff</span>
                </div>
                <button onClick={onLogout} className="text-gray-400 hover:text-red-500"><LogOut size={20} /></button>
            </div>

            <div className="md:hidden flex bg-white border-b border-gray-100 text-sm font-medium">
                <button
                    onClick={() => setActiveTab('AGENDA')}
                    className={`flex-1 py-3 border-b-2 text-center flex items-center justify-center gap-2 ${activeTab === 'AGENDA' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
                >
                    <Calendar size={18} /> Agenda
                </button>
                <button
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`flex-1 py-3 border-b-2 text-center flex items-center justify-center gap-2 ${activeTab === 'MESSAGES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
                >
                    <MessageSquare size={18} /> Mensajes
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 md:p-8 animate-fade-in">
                {activeTab === 'AGENDA' && (
                    <div className="space-y-6 max-w-5xl mx-auto">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900">Mis Citas de Hoy</h1>
                                <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <Button variant="secondary" className="flex gap-2 items-center"><Filter size={16} /> Filtros</Button>
                        </div>

                        {/* Timeline Event List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-0">
                            {appointments.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>No tienes citas programadas para hoy.</p>
                                </div>
                            ) : appointments.map((app, i) => (
                                <div key={app.id} className="relative pl-6 pb-6 border-l-2 border-indigo-100 last:border-0 last:pb-0">
                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_0_4px_white] ring-1 ring-indigo-200"></div>
                                    <div className="bg-gray-50 hover:bg-indigo-50/50 transition-colors p-4 rounded-xl border border-gray-100 -mt-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 text-indigo-600 font-bold">
                                                <Clock size={16} /> {formatTime12h(app.time)}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${app.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {app.status === 'confirmed' ? 'CONFIRMADA' : 'PENDIENTE'}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-1">{app.clientName}</h4>
                                        <div className="flex gap-3 text-sm text-gray-600 mb-4">
                                            <span className="flex items-center gap-1"><MapPin size={14} className="opacity-50" /> Sede Principal</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="secondary" className="bg-white hover:bg-gray-50 text-indigo-600 border-indigo-200">
                                                <MessageSquare size={14} className="mr-1 inline" /> Ver Chat
                                            </Button>
                                            <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 border-0">
                                                <CheckCircle size={14} className="mr-1 inline" /> Completar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'MESSAGES' && (
                    <div className="flex flex-col h-full items-center justify-center text-center text-gray-400 bg-white rounded-2xl border border-gray-100 min-h-[400px]">
                        <MessageSquare size={48} className="mb-4 text-gray-300" />
                        <h2 className="text-xl font-bold text-gray-600 mb-2">Bandeja de Mensajes</h2>
                        <p className="max-w-xs text-sm">Próximamente podrás chatear con tus clientes directamente desde esta sección.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default EmployeeDashboard;
