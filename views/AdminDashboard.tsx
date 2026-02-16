import React, { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, LogOut, Search, Clock, X, Check, Filter } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Appointment, Branch, Employee } from '../types';
import { Button } from '../components/Button';
import { HOURS_OF_OPERATION } from '../constants';

interface Props {
  onLogout: () => void;
}

type Tab = 'APPOINTMENTS' | 'EMPLOYEES' | 'BRANCHES';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Dom', full: 'Domingo' },
  { id: 1, label: 'Lun', full: 'Lunes' },
  { id: 2, label: 'Mar', full: 'Martes' },
  { id: 3, label: 'Mié', full: 'Miércoles' },
  { id: 4, label: 'Jue', full: 'Jueves' },
  { id: 5, label: 'Vie', full: 'Viernes' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
];

const AdminDashboard: React.FC<Props> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('APPOINTMENTS');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Filters
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');

  // Refresh data trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit Schedule State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editScheduleStart, setEditScheduleStart] = useState<number>(8);
  const [editScheduleEnd, setEditScheduleEnd] = useState<number>(17);
  const [editDaysOff, setEditDaysOff] = useState<number[]>([]);

  useEffect(() => {
    setAppointments(dataService.getAppointments().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setEmployees(dataService.getBranches().flatMap(b => dataService.getEmployeesByBranch(b.id))); // Simplify getting all employees
    setBranches(dataService.getBranches());
  }, [refreshKey]);

  // Open Modal
  const handleOpenScheduleEditor = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditScheduleStart(emp.schedule.start);
    setEditScheduleEnd(emp.schedule.end);
    setEditDaysOff([...emp.daysOff]);
  };

  // Save Logic
  const handleSaveSchedule = () => {
    if (!editingEmployee) return;

    if (editScheduleStart >= editScheduleEnd) {
      alert("La hora de inicio debe ser anterior a la hora de fin.");
      return;
    }

    const updatedEmployee: Employee = {
      ...editingEmployee,
      schedule: {
        start: Number(editScheduleStart),
        end: Number(editScheduleEnd),
      },
      daysOff: editDaysOff,
    };

    dataService.updateEmployee(updatedEmployee);
    setEditingEmployee(null);
    setRefreshKey(prev => prev + 1); // Refresh UI
  };

  const toggleDayOff = (dayId: number) => {
    setEditDaysOff(prev => {
      if (prev.includes(dayId)) {
        return prev.filter(d => d !== dayId); // Remove from days off (make available)
      } else {
        return [...prev, dayId]; // Add to days off
      }
    });
  };

  const renderSidebar = () => (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold tracking-tight">GestorCitas Admin</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <button 
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'APPOINTMENTS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Calendar size={18} /> Citas
        </button>
        <button 
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'EMPLOYEES' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Users size={18} /> Empleados
        </button>
        <button 
          onClick={() => setActiveTab('BRANCHES')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'BRANCHES' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <MapPin size={18} /> Sucursales
        </button>
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </div>
  );

  const renderAppointments = () => {
    const filteredAppointments = filterEmployeeId === 'all' 
      ? appointments 
      : appointments.filter(a => a.employeeId === filterEmployeeId);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Citas Agendadas</h2>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select 
                  value={filterEmployeeId} 
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm min-w-[200px]"
                >
                  <option value="all">Todos los empleados</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
             </div>
             
             <div className="text-sm font-medium text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200 whitespace-nowrap">
               Total: {filteredAppointments.length}
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-800 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Fecha/Hora</th>
                  <th className="px-6 py-4">Profesional</th>
                  <th className="px-6 py-4">Sucursal</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((appt) => {
                  const emp = dataService.getEmployeeById(appt.employeeId);
                  const branch = branches.find(b => b.id === appt.branchId);
                  return (
                    <tr key={appt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{appt.clientName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span>{appt.date}</span>
                          <span className="text-xs text-indigo-600 font-medium">{appt.time}:00 - {appt.time + 1}:00</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <img src={emp?.avatar} className="w-6 h-6 rounded-full" alt="" />
                          {emp?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">{branch?.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      {filterEmployeeId === 'all' ? 'No hay citas registradas.' : 'No hay citas para este empleado.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderEmployees = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestionar Empleados</h2>
        <Button size="sm">Nuevo Empleado</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map(emp => {
          const branch = branches.find(b => b.id === emp.branchId);
          return (
             <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
               <div className="flex items-start justify-between">
                 <div className="flex items-center gap-3">
                   <img src={emp.avatar} className="w-12 h-12 rounded-full object-cover" alt={emp.name}/>
                   <div>
                     <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                     <p className="text-xs text-gray-500">{emp.role}</p>
                   </div>
                 </div>
                 <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">{branch?.name}</span>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-2">
                 <div className="flex items-center gap-2">
                   <Clock size={14} className="text-indigo-500" />
                   {emp.schedule.start}:00 - {emp.schedule.end}:00
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Días Libres:</span>
                    {emp.daysOff.includes(0) && <span className="bg-red-50 text-red-600 px-1.5 rounded text-xs">Dom</span>}
                    {emp.daysOff.includes(6) && <span className="bg-red-50 text-red-600 px-1.5 rounded text-xs">Sáb</span>}
                    {!emp.daysOff.includes(0) && !emp.daysOff.includes(6) && <span className="text-gray-400 text-xs italic">Ninguno</span>}
                 </div>
               </div>
               <div className="mt-4 flex gap-2">
                 <button className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors">Editar Perfil</button>
                 <button 
                  onClick={() => handleOpenScheduleEditor(emp)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                 >
                   Horario
                 </button>
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
        <Button size="sm">Nueva Sucursal</Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
         {branches.map(branch => (
           <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
             <div className="h-32 bg-gray-100">
               <img src={branch.image} className="w-full h-full object-cover" alt={branch.name}/>
             </div>
             <div className="p-5 flex-1">
               <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.name}</h3>
               <p className="text-gray-500 flex items-center gap-1 text-sm"><MapPin size={14}/> {branch.address}</p>
             </div>
             <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <Button variant="secondary" className="text-xs py-1">Editar</Button>
             </div>
           </div>
         ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex relative">
      {renderSidebar()}
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white p-4 z-20 flex justify-between items-center">
        <span className="font-bold">Admin Panel</span>
        <button onClick={onLogout}><LogOut size={20}/></button>
      </div>

      <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 overflow-y-auto h-screen">
        {/* Mobile Nav Tabs */}
        <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
           <button onClick={() => setActiveTab('APPOINTMENTS')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeTab === 'APPOINTMENTS' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Citas</button>
           <button onClick={() => setActiveTab('EMPLOYEES')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeTab === 'EMPLOYEES' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Empleados</button>
           <button onClick={() => setActiveTab('BRANCHES')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeTab === 'BRANCHES' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Sucursales</button>
        </div>

        {activeTab === 'APPOINTMENTS' && renderAppointments()}
        {activeTab === 'EMPLOYEES' && renderEmployees()}
        {activeTab === 'BRANCHES' && renderBranches()}
      </main>

      {/* Edit Schedule Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Editar Horario</h3>
              <button 
                onClick={() => setEditingEmployee(null)}
                className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X size={20}/>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg">
                <img src={editingEmployee.avatar} alt="" className="w-10 h-10 rounded-full"/>
                <div>
                  <p className="font-semibold text-gray-900">{editingEmployee.name}</p>
                  <p className="text-xs text-indigo-600">{editingEmployee.role}</p>
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Hora Inicio</label>
                  <select 
                    value={editScheduleStart} 
                    onChange={(e) => setEditScheduleStart(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(h => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Hora Fin</label>
                  <select 
                    value={editScheduleEnd} 
                    onChange={(e) => setEditScheduleEnd(Number(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Days Off */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Días de Trabajo</label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isWorkDay = !editDaysOff.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        onClick={() => toggleDayOff(day.id)}
                        className={`
                          py-2 px-1 rounded-lg text-sm font-medium transition-all border
                          ${isWorkDay 
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                            : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}
                        `}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">* Los días marcados en <span className="text-green-600 font-medium">verde</span> son laborables.</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setEditingEmployee(null)}>Cancelar</Button>
              <Button fullWidth onClick={handleSaveSchedule}>Guardar Cambios</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;