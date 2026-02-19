import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Users, MapPin, LogOut, Clock, X, Link as LinkIcon, Plus, Trash2, CheckCircle, Sparkles, Scissors, Edit2, DollarSign, Activity, ChevronLeft, ChevronRight, List, User, Phone, Mail, History } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Appointment, Branch, Employee, DaySchedule, TimeRange, Service, Client } from '../types';
import { Button } from '../components/Button';
import { HOURS_OF_OPERATION } from '../constants';

interface Props {
  onLogout: () => void;
}

type Tab = 'APPOINTMENTS' | 'CLIENTS' | 'EMPLOYEES' | 'BRANCHES' | 'SERVICES';
type ViewMode = 'LIST' | 'CALENDAR';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lun', full: 'Lunes' },
  { id: 2, label: 'Mar', full: 'Martes' },
  { id: 3, label: 'Mié', full: 'Miércoles' },
  { id: 4, label: 'Jue', full: 'Jueves' },
  { id: 5, label: 'Vie', full: 'Viernes' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
  { id: 0, label: 'Dom', full: 'Domingo' },
];

const AdminDashboard: React.FC<Props> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('APPOINTMENTS');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filters & View State
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('CALENDAR');
  const [calendarDate, setCalendarDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // --- Modals State ---
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [tempSchedule, setTempSchedule] = useState<DaySchedule[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number>(1); 
  const [assigningServicesEmployee, setAssigningServicesEmployee] = useState<Employee | null>(null);
  const [tempServiceIds, setTempServiceIds] = useState<string[]>([]);
  const [editingEmployeeProfile, setEditingEmployeeProfile] = useState<Partial<Employee> | null>(null);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [viewingClientHistory, setViewingClientHistory] = useState<Client | null>(null);
  const [historyLimit, setHistoryLimit] = useState(5);
  
  // --- Appointment Modal State ---
  const [editingAppointment, setEditingAppointment] = useState<Partial<Appointment> | null>(null);

  useEffect(() => {
    const allBranches = dataService.getBranches();
    const allServices = dataService.getServices();
    
    setBranches(allBranches);
    setServices(allServices);
    setAppointments(dataService.getAppointments().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setClients(dataService.getClients());
    
    // Flatten employees for list view
    const allEmps = allBranches.flatMap(b => dataService.getEmployeesByBranch(b.id));
    const uniqueEmps = Array.from(new Map(allEmps.map(item => [item.id, item])).values());
    setEmployees(uniqueEmps);

    // Default branch selection for calendar
    if (!selectedBranchId && allBranches.length > 0) {
      setSelectedBranchId(allBranches[0].id);
    }
  }, [refreshKey, selectedBranchId]);

  // --- Client Logic ---

  const handleSaveClient = () => {
    if (!editingClient || !editingClient.name || !editingClient.phone) {
        alert('Nombre y Teléfono son obligatorios');
        return;
    }
    
    if (editingClient.id) {
        dataService.updateClient(editingClient as Client);
    } else {
        dataService.addClient({
            name: editingClient.name,
            email: editingClient.email || '',
            phone: editingClient.phone
        });
    }
    setEditingClient(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteClient = (id: string) => {
      if (window.confirm('¿Eliminar cliente?')) {
          const success = dataService.deleteClient(id);
          if (!success) {
              alert('No se puede eliminar un cliente con citas activas.');
          } else {
              setRefreshKey(prev => prev + 1);
          }
      }
  };

  const handleViewHistory = (client: Client) => {
      setViewingClientHistory(client);
      setHistoryLimit(5); // Reset limit
  };

  // --- Appointment Logic ---

  const handleDeleteAppointment = (id: string) => {
    if (window.confirm('¿Seguro que deseas cancelar esta cita?')) {
        dataService.deleteAppointment(id);
        setEditingAppointment(null);
        setRefreshKey(prev => prev + 1);
    }
  };

  const handleSaveAppointment = () => {
    if (!editingAppointment || !editingAppointment.clientId || !editingAppointment.date || !editingAppointment.employeeId || !editingAppointment.serviceId) {
        alert('Por favor completa todos los campos requeridos (Cliente, Servicio, Profesional, Fecha, Hora).');
        return;
    }

    // Validation
    const isAvailable = dataService.isEmployeeAvailable(
        editingAppointment.employeeId,
        editingAppointment.date,
        editingAppointment.time!,
        editingAppointment.serviceId,
        editingAppointment.id // Exclude self if editing
    );

    if (!isAvailable) {
        alert('El empleado no está disponible en este horario o no realiza este servicio.');
        return;
    }

    const client = dataService.getClientById(editingAppointment.clientId);

    if (editingAppointment.id) {
        dataService.updateAppointment({
            ...editingAppointment,
            clientName: client?.name || 'Cliente' // Update display name
        } as Appointment);
    } else {
        dataService.addAppointment({
            branchId: editingAppointment.branchId!,
            employeeId: editingAppointment.employeeId,
            serviceId: editingAppointment.serviceId,
            clientId: editingAppointment.clientId,
            date: editingAppointment.date,
            time: editingAppointment.time!,
            clientName: client?.name || 'Cliente',
        });
    }

    setEditingAppointment(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleSlotClick = (empId: string, time: number) => {
      setEditingAppointment({
          branchId: selectedBranchId,
          employeeId: empId,
          date: calendarDate,
          time: time,
          status: 'confirmed'
      });
  };

  const handleEditAppointmentClick = (appt: Appointment) => {
      setEditingAppointment({ ...appt });
  };

  const changeCalendarDate = (days: number) => {
      const date = new Date(calendarDate);
      date.setDate(date.getDate() + days);
      setCalendarDate(date.toISOString().split('T')[0]);
  };

  // --- Reused Logic (Schedule, Employees, etc) ---
  const handleOpenScheduleEditor = (emp: Employee) => {
    setEditingEmployee(emp);
    setTempSchedule(JSON.parse(JSON.stringify(emp.weeklySchedule)));
    setSelectedDayId(1);
  };

  const getCurrentDaySchedule = () => {
    return tempSchedule.find(d => d.dayOfWeek === selectedDayId) || { dayOfWeek: selectedDayId, isWorkDay: false, ranges: [] };
  };

  const updateCurrentDaySchedule = (updates: Partial<DaySchedule>) => {
    setTempSchedule(prev => prev.map(day => 
      day.dayOfWeek === selectedDayId ? { ...day, ...updates } : day
    ));
  };

  const toggleDayStatus = () => {
    const current = getCurrentDaySchedule();
    const isNowWorkDay = !current.isWorkDay;
    let updates: Partial<DaySchedule> = { isWorkDay: isNowWorkDay };
    if (isNowWorkDay && current.ranges.length === 0) {
      updates.ranges = [{ start: HOURS_OF_OPERATION[0], end: HOURS_OF_OPERATION[HOURS_OF_OPERATION.length - 1] }];
    }
    updateCurrentDaySchedule(updates);
  };

  const addRange = () => {
    const current = getCurrentDaySchedule();
    let start = 8;
    let end = 12;
    if (current.ranges.length > 0) {
        const lastRange = current.ranges[current.ranges.length - 1];
        if (lastRange.end < HOURS_OF_OPERATION[HOURS_OF_OPERATION.length - 1]) {
            start = lastRange.end + 1;
            end = Math.min(start + 4, HOURS_OF_OPERATION[HOURS_OF_OPERATION.length - 1]);
        }
    }
    if (start >= HOURS_OF_OPERATION[HOURS_OF_OPERATION.length - 1]) {
       start = HOURS_OF_OPERATION[HOURS_OF_OPERATION.length - 2];
       end = HOURS_OF_OPERATION[HOURS_OF_OPERATION.length - 1];
    }
    const newRange: TimeRange = { start, end };
    updateCurrentDaySchedule({ ranges: [...current.ranges, newRange] });
  };

  const removeRange = (index: number) => {
    const current = getCurrentDaySchedule();
    const newRanges = [...current.ranges];
    newRanges.splice(index, 1);
    updateCurrentDaySchedule({ ranges: newRanges });
  };

  const updateRange = (index: number, field: 'start' | 'end', value: number) => {
    const current = getCurrentDaySchedule();
    const newRanges = current.ranges.map((r, i) => {
      if (i === index) return { ...r, [field]: value };
      return r;
    });
    updateCurrentDaySchedule({ ranges: newRanges });
  };

  const handleSaveSchedule = () => {
    if (!editingEmployee) return;
    const updatedEmployee: Employee = { ...editingEmployee, weeklySchedule: tempSchedule };
    dataService.updateEmployee(updatedEmployee);
    setEditingEmployee(null);
    setRefreshKey(prev => prev + 1);
  };

  // --- Renderers ---

  const renderSidebar = () => (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold tracking-tight">GestorCitas Admin</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {[
            { id: 'APPOINTMENTS', icon: CalendarIcon, label: 'Citas' },
            { id: 'CLIENTS', icon: Users, label: 'Clientes' },
            { id: 'SERVICES', icon: Scissors, label: 'Servicios' },
            { id: 'EMPLOYEES', icon: User, label: 'Empleados' },
            { id: 'BRANCHES', icon: MapPin, label: 'Sucursales' }
        ].map(item => (
            <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
                <item.icon size={18} /> {item.label}
            </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-4">
        <button onClick={() => {
            const baseUrl = window.location.origin + window.location.pathname;
            const directLink = `${baseUrl}?view=booking`;
            navigator.clipboard.writeText(directLink).then(() => alert('Enlace copiado')).catch(() => alert('Copia: ' + directLink));
        }} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors border border-slate-700">
          <LinkIcon size={14} /> Copiar Enlace Citas
        </button>
        <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </div>
  );

  const renderCalendarView = () => {
    const branchEmployees = dataService.getEmployeesByBranch(selectedBranchId);
    
    // Get appointments for this date and these employees
    const dayAppointments = appointments.filter(a => 
        a.date === calendarDate && 
        a.branchId === selectedBranchId &&
        a.status === 'confirmed'
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">
             {/* Calendar Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
                        <button onClick={() => changeCalendarDate(-1)} className="p-2 hover:bg-gray-100 border-r border-gray-200 text-gray-600"><ChevronLeft size={20}/></button>
                        <div className="px-4 py-2 font-medium text-gray-800 min-w-[150px] text-center">
                            {new Date(calendarDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <button onClick={() => changeCalendarDate(1)} className="p-2 hover:bg-gray-100 border-l border-gray-200 text-gray-600"><ChevronRight size={20}/></button>
                    </div>
                    <button 
                        onClick={() => setCalendarDate(new Date().toISOString().split('T')[0])}
                        className="text-sm text-indigo-600 font-medium hover:underline"
                    >
                        Hoy
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <select 
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="bg-white border-none font-medium text-gray-700 outline-none cursor-pointer focus:ring-0"
                    >
                        {branches.map(b => <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <div className="min-w-[800px]">
                    {/* Header Row (Employees) */}
                    <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10 shadow-sm">
                        <div className="w-20 shrink-0 border-r border-gray-200 p-3 text-center text-xs font-semibold text-gray-500 bg-gray-50">
                            Hora
                        </div>
                        {branchEmployees.map(emp => (
                            <div key={emp.id} className="flex-1 p-3 flex flex-col items-center justify-center border-r border-gray-200 min-w-[140px]">
                                <img src={emp.avatar} className="w-8 h-8 rounded-full mb-1 object-cover" />
                                <span className="text-sm font-bold text-gray-800 truncate w-full text-center">{emp.name}</span>
                                <span className="text-xs text-gray-500 truncate w-full text-center">{emp.role}</span>
                            </div>
                        ))}
                    </div>

                    {/* Time Rows */}
                    {HOURS_OF_OPERATION.map(hour => (
                        <div key={hour} className="flex border-b border-gray-100 h-24 hover:bg-gray-50/50 transition-colors">
                            <div className="w-20 shrink-0 border-r border-gray-200 p-2 text-center text-xs text-gray-500 font-medium pt-3">
                                {hour}:00
                            </div>
                            {branchEmployees.map(emp => {
                                const appt = dayAppointments.find(a => a.employeeId === emp.id && a.time === hour);
                                const service = appt ? services.find(s => s.id === appt.serviceId) : null;
                                const isScheduled = emp.weeklySchedule.find(s => s.dayOfWeek === new Date(calendarDate).getDay())?.isWorkDay;
                                const bgClass = isScheduled ? 'bg-white' : 'bg-gray-50/50 repeating-linear-gradient';

                                return (
                                    <div 
                                        key={`${emp.id}-${hour}`} 
                                        className={`flex-1 border-r border-gray-200 p-1 min-w-[140px] relative group ${bgClass}`}
                                    >
                                        {appt ? (
                                            <div 
                                                onClick={() => handleEditAppointmentClick(appt)}
                                                className="h-full w-full rounded-lg bg-indigo-50 border border-indigo-200 p-2 cursor-pointer hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-sm flex flex-col justify-between"
                                            >
                                                <div className="font-semibold text-xs text-indigo-900 line-clamp-1">{appt.clientName}</div>
                                                <div className="text-xs text-indigo-600 line-clamp-1">{service?.name || 'Servicio'}</div>
                                                <div className="text-[10px] text-indigo-400">{hour}:00 - {hour + (service ? Math.ceil(service.duration/60) : 1)}:00</div>
                                            </div>
                                        ) : (
                                            isScheduled && (
                                                <div 
                                                    onClick={() => handleSlotClick(emp.id, hour)}
                                                    className="w-full h-full rounded opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-all"
                                                >
                                                    <Plus className="text-gray-400" size={20} />
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderClients = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Directorio de Clientes</h2>
            <Button size="sm" onClick={() => setEditingClient({ name: '', phone: '', email: '' })}>
                <Plus size={16} className="mr-2"/> Nuevo Cliente
            </Button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-800 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Nombre</th>
                            <th className="px-6 py-4">Teléfono</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4 text-center">Historial</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {clients.map(client => (
                            <tr key={client.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                        {client.name.charAt(0)}
                                    </div>
                                    {client.name}
                                </td>
                                <td className="px-6 py-4">{client.phone}</td>
                                <td className="px-6 py-4">{client.email || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleViewHistory(client)}
                                        className="text-indigo-600 hover:underline text-xs font-medium"
                                    >
                                        Ver Citas
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingClient(client)} className="text-gray-500 hover:text-indigo-600"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteClient(client.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

  const renderAppointments = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Citas Agendadas</h2>
          <div className="flex items-center gap-3">
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List size={18}/>
                </button>
                <button 
                    onClick={() => setViewMode('CALENDAR')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'CALENDAR' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CalendarIcon size={18}/>
                </button>
             </div>
             
             {viewMode === 'LIST' && (
                 <div className="relative">
                    <Users size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select 
                      value={filterEmployeeId} 
                      onChange={(e) => setFilterEmployeeId(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]"
                    >
                      <option value="all" className="text-gray-900">Todos los empleados</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id} className="text-gray-900">{emp.name}</option>)}
                    </select>
                 </div>
             )}
          </div>
        </div>

        {viewMode === 'CALENDAR' ? renderCalendarView() : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-800 uppercase text-xs font-semibold">
                    <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Servicio</th>
                    <th className="px-6 py-4">Fecha/Hora</th>
                    <th className="px-6 py-4">Profesional</th>
                    <th className="px-6 py-4">Sucursal</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {appointments.filter(a => filterEmployeeId === 'all' || a.employeeId === filterEmployeeId).map((appt) => {
                    const emp = dataService.getEmployeeById(appt.employeeId);
                    const branch = branches.find(b => b.id === appt.branchId);
                    const srv = services.find(s => s.id === appt.serviceId);
                    return (
                        <tr key={appt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{appt.clientName}</td>
                        <td className="px-6 py-4 text-indigo-600 font-medium">{srv?.name || 'Servicio General'}</td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col">
                            <span>{appt.date}</span>
                            <span className="text-xs text-gray-500">{appt.time}:00 - {appt.time + 1}:00</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">{emp?.name || 'Desconocido'}</td>
                        <td className="px-6 py-4">{branch?.name}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{appt.status}</span></td>
                        <td className="px-6 py-4">
                            <div className="flex gap-2">
                                <button onClick={() => setEditingAppointment(appt)} className="text-indigo-600 hover:text-indigo-900"><Edit2 size={16}/></button>
                                <button onClick={() => handleDeleteAppointment(appt.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                            </div>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
            </div>
        )}
      </div>
    );
  };

  const renderServices = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Catálogo de Servicios</h2>
            <Button size="sm" onClick={() => setEditingService({
                name: '',
                description: '',
                duration: 30,
                price: 0,
                active: true
            })}>
                <Plus size={16} className="mr-2"/> Nuevo Servicio
            </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map(srv => (
                <div key={srv.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                            <Scissors size={24} />
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${srv.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {srv.active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{srv.name}</h3>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{srv.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium pt-4 border-t border-gray-100 mb-4">
                        <span className="text-gray-600 flex items-center gap-1"><Clock size={14}/> {srv.duration} min</span>
                        <span className="text-gray-900 text-lg">${srv.price}</span>
                    </div>
                    <div className="flex gap-2 mt-auto">
                        <button 
                            onClick={() => setEditingService(srv)}
                            className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                        >
                            Editar
                        </button>
                        <button 
                            onClick={() => {
                                if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
                                    dataService.deleteService(srv.id);
                                    setRefreshKey(prev => prev + 1);
                                }
                            }}
                            className="flex-1 py-2 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestionar Empleados</h2>
        <Button size="sm" onClick={() => {
            const defaultSchedule: DaySchedule[] = [];
            for (let i = 0; i < 7; i++) {
                const isWorkDay = i !== 0 && i !== 6; 
                defaultSchedule.push({ dayOfWeek: i, isWorkDay, ranges: isWorkDay ? [{ start: 9, end: 17 }] : [] });
            }
            setEditingEmployeeProfile({
                name: '', role: 'Estilista', branchId: branches[0]?.id || '',
                avatar: `https://picsum.photos/100/100?random=${Math.floor(Math.random() * 1000)}`,
                weeklySchedule: defaultSchedule, serviceIds: []
            });
        }}><Plus size={16} className="mr-2"/> Nuevo Empleado</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map(emp => {
          const branch = branches.find(b => b.id === emp.branchId);
          return (
             <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative group">
               <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => setEditingEmployeeProfile(emp)} className="p-1.5 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-white rounded-md shadow-sm border border-transparent hover:border-gray-200"><Edit2 size={14}/></button>
                   <button onClick={() => {
                       if (window.confirm('¿Seguro que deseas eliminar a este empleado?')) {
                           dataService.deleteEmployee(emp.id);
                           setRefreshKey(prev => prev + 1);
                       }
                   }} className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-white rounded-md shadow-sm border border-transparent hover:border-gray-200"><Trash2 size={14}/></button>
               </div>
               
               <div className="flex items-start justify-between">
                 <div className="flex items-center gap-3">
                   <img src={emp.avatar} className="w-12 h-12 rounded-full object-cover" alt={emp.name}/>
                   <div>
                     <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                     <p className="text-xs text-gray-500">{emp.role}</p>
                   </div>
                 </div>
               </div>
               
               <div className="mt-2 mb-4">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded inline-flex items-center gap-1">
                      <MapPin size={10}/> {branch?.name || 'Sin Sucursal'}
                  </span>
               </div>

               <div className="pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-2">
                 <div className="flex items-center gap-2">
                   <Clock size={14} className="text-indigo-500" />
                   {/* Schedule Summary logic inline for brevity */}
                   {(() => {
                       const today = new Date().getDay();
                       const s = emp.weeklySchedule.find(x => x.dayOfWeek === today);
                       return s && s.isWorkDay && s.ranges.length > 0 ? 
                        <span className="text-indigo-600 font-medium">Hoy: {s.ranges.map(r => `${r.start}-${r.end}h`).join(', ')}</span> : 
                        <span className="text-gray-400 italic">Hoy no trabaja</span>;
                   })()}
                 </div>
               </div>
               <div className="mt-4 flex gap-2">
                 <button onClick={() => { setAssigningServicesEmployee(emp); setTempServiceIds([...emp.serviceIds]); }} className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors">Servicios</button>
                 <button onClick={() => handleOpenScheduleEditor(emp)} className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">Horario</button>
               </div>
             </div>
          );
        })}
      </div>
    </div>
  );

  const renderBranches = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Sucursales</h2>
        <Button size="sm" onClick={() => setEditingBranch({
            name: '', address: '', image: 'https://picsum.photos/400/200?random=' + Math.floor(Math.random() * 100), serviceIds: []
        })}><Plus size={16} className="mr-2"/> Nueva Sucursal</Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
         {branches.map(branch => (
           <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
             <div className="h-32 bg-gray-100 relative group">
               <img src={branch.image} className="w-full h-full object-cover" alt={branch.name}/>
               <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => setEditingBranch(branch)} className="p-2 bg-white/90 hover:bg-white rounded-full text-indigo-600 shadow-sm transition-colors"><Edit2 size={16}/></button>
                 <button onClick={() => { if(window.confirm('Eliminar sucursal?')) { dataService.deleteBranch(branch.id); setRefreshKey(prev => prev + 1); } }} className="p-2 bg-white/90 hover:bg-white rounded-full text-red-600 shadow-sm transition-colors"><Trash2 size={16}/></button>
               </div>
             </div>
             <div className="p-5 flex-1 flex flex-col">
               <div className="flex-1">
                 <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.name}</h3>
                 <p className="text-gray-500 flex items-center gap-1 text-sm"><MapPin size={14}/> {branch.address}</p>
                 <div className="mt-3 flex gap-2 flex-wrap">
                     {services.filter(s => (branch.serviceIds || []).includes(s.id)).slice(0,3).map(s => (
                         <span key={s.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{s.name}</span>
                     ))}
                     {(branch.serviceIds?.length || 0) > 3 && <span className="text-xs text-gray-400">+{branch.serviceIds.length - 3} más</span>}
                 </div>
               </div>
               <button onClick={() => setEditingBranch(branch)} className="w-full mt-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Editar Sucursal</button>
             </div>
           </div>
         ))}
      </div>
    </div>
  );

  // --- Modals ---

  const renderClientModal = () => {
      if (!editingClient) return null;
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800">{editingClient.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                      <button onClick={() => setEditingClient(null)}><X size={20} className="text-gray-500"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                          <input 
                              type="text" 
                              value={editingClient.name} 
                              onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                              placeholder="Ej. Juan Pérez"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                          <input 
                              type="text" 
                              value={editingClient.phone} 
                              onChange={e => setEditingClient({...editingClient, phone: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                              placeholder="Ej. 555-1234"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email (Opcional)</label>
                          <input 
                              type="email" 
                              value={editingClient.email} 
                              onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                              placeholder="cliente@email.com"
                          />
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setEditingClient(null)}>Cancelar</Button>
                      <Button onClick={handleSaveClient}>Guardar</Button>
                  </div>
              </div>
          </div>
      );
  };

  const renderClientHistoryModal = () => {
    if (!viewingClientHistory) return null;
    const history = dataService.getAppointmentsByClient(viewingClientHistory.id);
    const displayedHistory = history.slice(0, historyLimit);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-gray-800">Historial de Citas</h3>
                        <p className="text-sm text-gray-500">{viewingClientHistory.name}</p>
                    </div>
                    <button onClick={() => setViewingClientHistory(null)}><X size={20} className="text-gray-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">Este cliente no tiene citas registradas.</div>
                    ) : (
                        <div className="space-y-3">
                            {displayedHistory.map(appt => {
                                const srv = services.find(s => s.id === appt.serviceId);
                                const emp = employees.find(e => e.id === appt.employeeId);
                                return (
                                    <div key={appt.id} className="p-4 border border-gray-100 rounded-lg flex justify-between items-center hover:bg-gray-50">
                                        <div>
                                            <div className="font-medium text-gray-900">{srv?.name}</div>
                                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                                <CalendarIcon size={12}/> {appt.date} 
                                                <Clock size={12}/> {appt.time}:00
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-indigo-600 font-medium">{emp?.name}</div>
                                            <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {appt.status}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {history.length > historyLimit && (
                                <button 
                                    onClick={() => setHistoryLimit(prev => prev + 5)}
                                    className="w-full py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg mt-2 transition-colors"
                                >
                                    Cargar más citas ({history.length - historyLimit} restantes)...
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const renderAppointmentModal = () => {
      if (!editingAppointment) return null;
      const branchEmps = dataService.getEmployeesByBranch(editingAppointment.branchId || selectedBranchId);
      const branchServices = dataService.getServicesByBranch(editingAppointment.branchId || selectedBranchId);

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">{editingAppointment.id ? 'Editar Cita' : 'Nueva Cita'}</h3>
                    <button onClick={() => setEditingAppointment(null)}><X size={20} className="text-gray-500"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                        <div className="flex gap-2">
                             <select 
                                value={editingAppointment.clientId || ''}
                                onChange={(e) => setEditingAppointment({...editingAppointment, clientId: e.target.value})}
                                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                             >
                                <option value="">Seleccionar Cliente</option>
                                {clients.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
                             </select>
                             <button 
                                onClick={() => setEditingClient({ name: '', phone: '' })} // Open Client Modal
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                                title="Nuevo Cliente"
                             >
                                <Plus size={20}/>
                             </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                            <input 
                                type="date"
                                value={editingAppointment.date}
                                onChange={(e) => setEditingAppointment({...editingAppointment, date: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                            <select 
                                value={editingAppointment.time}
                                onChange={(e) => setEditingAppointment({...editingAppointment, time: Number(e.target.value)})}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                            >
                                {HOURS_OF_OPERATION.map(h => <option key={h} value={h} className="text-gray-900">{h}:00</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
                        <select 
                            value={editingAppointment.serviceId}
                            onChange={(e) => setEditingAppointment({...editingAppointment, serviceId: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                        >
                            <option value="">Seleccionar Servicio</option>
                            {branchServices.map(s => <option key={s.id} value={s.id} className="text-gray-900">{s.name} ({s.duration} min)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Profesional</label>
                        <select 
                            value={editingAppointment.employeeId}
                            onChange={(e) => setEditingAppointment({...editingAppointment, employeeId: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                        >
                            <option value="">Seleccionar Profesional</option>
                            {branchEmps.filter(e => !editingAppointment.serviceId || e.serviceIds.includes(editingAppointment.serviceId!)).map(e => (
                                <option key={e.id} value={e.id} className="text-gray-900">{e.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    {editingAppointment.id && (
                        <Button variant="danger" onClick={() => handleDeleteAppointment(editingAppointment.id!)}>Eliminar</Button>
                    )}
                    <Button variant="secondary" onClick={() => setEditingAppointment(null)}>Cancelar</Button>
                    <Button onClick={handleSaveAppointment}>Guardar</Button>
                </div>
             </div>
        </div>
      );
  };

  const renderScheduleEditor = () => {
    if (!editingEmployee) return null;
    const currentSchedule = getCurrentDaySchedule();
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
             <h3 className="font-bold text-gray-800">Horario: {editingEmployee.name}</h3>
             <button onClick={() => setEditingEmployee(null)}><X size={20}/></button>
          </div>
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
             <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50 p-2 overflow-y-auto">
                <div className="space-y-1">
                   {DAYS_OF_WEEK.map(day => (
                       <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${selectedDayId === day.id ? 'bg-white shadow-sm ring-1 ring-gray-200 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                         <span>{day.full}</span>
                         <span className={`w-2 h-2 rounded-full ${tempSchedule.find(s=>s.dayOfWeek===day.id)?.isWorkDay ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                       </button>
                   ))}
                </div>
             </div>
             <div className="flex-1 p-6 overflow-y-auto bg-white">
                <div className="flex justify-between items-center mb-6">
                   <h4 className="text-xl font-bold text-gray-800">{DAYS_OF_WEEK.find(d => d.id === selectedDayId)?.full}</h4>
                   <button onClick={toggleDayStatus} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${currentSchedule.isWorkDay ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{currentSchedule.isWorkDay ? 'Laborable' : 'Descanso'}</button>
                </div>
                {currentSchedule.isWorkDay && (
                  <div className="space-y-4">
                     {currentSchedule.ranges.map((range, idx) => (
                       <div key={idx} className="flex items-center gap-3">
                          <select value={range.start} onChange={(e) => updateRange(idx, 'start', Number(e.target.value))} className="p-2 border rounded bg-white text-gray-900">{HOURS_OF_OPERATION.map(h => <option key={h} value={h}>{h}:00</option>)}</select>
                          <span>-</span>
                          <select value={range.end} onChange={(e) => updateRange(idx, 'end', Number(e.target.value))} className="p-2 border rounded bg-white text-gray-900">{HOURS_OF_OPERATION.map(h => <option key={h} value={h} disabled={h <= range.start}>{h}:00</option>)}</select>
                          <button onClick={() => removeRange(idx)} className="text-red-500"><Trash2 size={18} /></button>
                       </div>
                     ))}
                     <button onClick={addRange} className="text-indigo-600 text-sm flex items-center gap-1"><Plus size={14}/> Agregar turno</button>
                  </div>
                )}
             </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditingEmployee(null)}>Cancelar</Button>
            <Button onClick={handleSaveSchedule}>Guardar</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderServiceAssignModal = () => {
      if (!assigningServicesEmployee) return null;
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="font-bold mb-4">Servicios: {assigningServicesEmployee.name}</h3>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                      {services.map(s => (
                          <div key={s.id} onClick={() => setTempServiceIds(prev => prev.includes(s.id) ? prev.filter(x=>x!==s.id) : [...prev, s.id])} className={`p-3 border rounded cursor-pointer flex justify-between ${tempServiceIds.includes(s.id) ? 'bg-indigo-50 border-indigo-500 text-indigo-900' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                              <span>{s.name}</span>
                              {tempServiceIds.includes(s.id) && <CheckCircle size={16} className="text-indigo-600"/>}
                          </div>
                      ))}
                  </div>
                  <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setAssigningServicesEmployee(null)}>Cancelar</Button>
                      <Button onClick={() => {
                          dataService.updateEmployee({...assigningServicesEmployee, serviceIds: tempServiceIds});
                          setAssigningServicesEmployee(null);
                          setRefreshKey(prev => prev + 1);
                      }}>Guardar</Button>
                  </div>
              </div>
          </div>
      )
  }

  const renderEmployeeProfileModal = () => {
    if(!editingEmployeeProfile) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                <h3 className="font-bold">Editar Empleado</h3>
                <input placeholder="Nombre" value={editingEmployeeProfile.name} onChange={e=>setEditingEmployeeProfile({...editingEmployeeProfile, name: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                <input placeholder="Rol" value={editingEmployeeProfile.role} onChange={e=>setEditingEmployeeProfile({...editingEmployeeProfile, role: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                <select value={editingEmployeeProfile.branchId} onChange={e=>setEditingEmployeeProfile({...editingEmployeeProfile, branchId: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900">
                    {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={()=>setEditingEmployeeProfile(null)}>Cancelar</Button>
                    <Button onClick={() => {
                        if(editingEmployeeProfile.id) dataService.updateEmployee(editingEmployeeProfile as Employee);
                        else dataService.addEmployee(editingEmployeeProfile as Employee);
                        setEditingEmployeeProfile(null);
                        setRefreshKey(prev=>prev+1);
                    }}>Guardar</Button>
                </div>
            </div>
        </div>
    )
  }

  const renderBranchModal = () => {
    if(!editingBranch) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                <h3 className="font-bold">Sucursal</h3>
                <input placeholder="Nombre" value={editingBranch.name} onChange={e=>setEditingBranch({...editingBranch, name: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                <input placeholder="Dirección" value={editingBranch.address} onChange={e=>setEditingBranch({...editingBranch, address: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                <input placeholder="Imagen URL" value={editingBranch.image} onChange={e=>setEditingBranch({...editingBranch, image: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                
                <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Servicios Disponibles</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {services.map(srv => {
                            const isSelected = (editingBranch.serviceIds || []).includes(srv.id);
                            return (
                                <div 
                                    key={srv.id}
                                    onClick={() => {
                                        const currentIds = editingBranch.serviceIds || [];
                                        const newIds = currentIds.includes(srv.id) ? currentIds.filter(id => id !== srv.id) : [...currentIds, srv.id];
                                        setEditingBranch({ ...editingBranch, serviceIds: newIds });
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-700'}`}
                                >
                                    <span className="text-sm font-medium">{srv.name}</span>
                                    {isSelected && <CheckCircle size={16} className="text-indigo-600"/>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={()=>setEditingBranch(null)}>Cancelar</Button>
                    <Button onClick={() => {
                        if(editingBranch.id) dataService.updateBranch(editingBranch as Branch);
                        else dataService.addBranch(editingBranch as Branch);
                        setEditingBranch(null);
                        setRefreshKey(prev=>prev+1);
                    }}>Guardar</Button>
                </div>
            </div>
        </div>
    )
  }

  const renderServiceEditorModal = () => {
    if(!editingService) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                <h3 className="font-bold">Servicio</h3>
                <input placeholder="Nombre" value={editingService.name} onChange={e=>setEditingService({...editingService, name: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                <textarea placeholder="Descripción" value={editingService.description} onChange={e=>setEditingService({...editingService, description: e.target.value})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                <div className="flex gap-2">
                    <input type="number" placeholder="Duración (min)" value={editingService.duration} onChange={e=>setEditingService({...editingService, duration: Number(e.target.value)})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                    <input type="number" placeholder="Precio" value={editingService.price} onChange={e=>setEditingService({...editingService, price: Number(e.target.value)})} className="w-full border p-2 rounded bg-white text-gray-900"/>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={()=>setEditingService(null)}>Cancelar</Button>
                    <Button onClick={() => {
                        if(editingService.id) dataService.updateService(editingService as Service);
                        else dataService.addService(editingService as Service);
                        setEditingService(null);
                        setRefreshKey(prev=>prev+1);
                    }}>Guardar</Button>
                </div>
            </div>
        </div>
    )
  }


  return (
    <div className="min-h-screen bg-gray-100 flex relative">
      {renderSidebar()}
      
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white p-4 z-20 flex justify-between items-center">
        <span className="font-bold">Admin Panel</span>
        <button onClick={onLogout}><LogOut size={20}/></button>
      </div>

      <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 overflow-y-auto h-screen">
        <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
           <button onClick={() => setActiveTab('APPOINTMENTS')} className="px-4 py-2 rounded-full bg-white text-sm">Citas</button>
           <button onClick={() => setActiveTab('CLIENTS')} className="px-4 py-2 rounded-full bg-white text-sm">Clientes</button>
           <button onClick={() => setActiveTab('SERVICES')} className="px-4 py-2 rounded-full bg-white text-sm">Servicios</button>
        </div>

        {activeTab === 'APPOINTMENTS' && renderAppointments()}
        {activeTab === 'CLIENTS' && renderClients()}
        {activeTab === 'SERVICES' && renderServices()}
        {activeTab === 'EMPLOYEES' && renderEmployees()}
        {activeTab === 'BRANCHES' && renderBranches()}
      </main>

      {renderScheduleEditor()}
      {renderServiceAssignModal()}
      {renderEmployeeProfileModal()}
      {renderBranchModal()}
      {renderServiceEditorModal()}
      {renderAppointmentModal()}
      {renderClientModal()}
      {renderClientHistoryModal()}
    </div>
  );
};

export default AdminDashboard;