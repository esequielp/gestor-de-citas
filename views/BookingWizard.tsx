import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Branch, Employee } from '../types';
import { dataService } from '../services/dataService';
import { HOURS_OF_OPERATION } from '../constants';
import { Button } from '../components/Button';

interface Props {
  onBack: () => void;
}

type Step = 1 | 2 | 3 | 4;

const BookingWizard: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<Step>(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Selection State
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); // Null means "Anyone" if explicitly chosen logic allows
  const [isAutoAssign, setIsAutoAssign] = useState(false);
  const [clientName, setClientName] = useState('');

  // Initial Data Load
  useEffect(() => {
    setBranches(dataService.getBranches());
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Update employees when time/date changes (Step 2 -> 3 transition logic check)
  useEffect(() => {
    if (selectedBranch && selectedDate && selectedTime !== null) {
      const available = dataService.getAvailableEmployeesForSlot(selectedBranch.id, selectedDate, selectedTime);
      setAvailableEmployees(available);
    }
  }, [selectedBranch, selectedDate, selectedTime]);

  // --- Handlers ---

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setStep(2);
  };

  const handleTimeSelect = (time: number) => {
    setSelectedTime(time);
    // Don't auto advance, let user confirm details visually
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedTime(null); // Reset time when date changes
  };

  const confirmTimeAndProceed = () => {
    if (selectedTime !== null && selectedDate) {
      // Fetch ALL employees for the branch to show status (Available vs Busy)
      setStep(3);
    }
  };

  const handleEmployeeSelect = (employee: Employee | 'any') => {
    if (employee === 'any') {
      setIsAutoAssign(true);
      // Pick first available
      const anyAvailable = dataService.getAvailableEmployeesForSlot(selectedBranch!.id, selectedDate, selectedTime!);
      if (anyAvailable.length > 0) {
        setSelectedEmployee(anyAvailable[0]);
      } else {
        // Should not happen if we filtered correctly before showing 'any'
        alert('Error: No hay empleados disponibles');
        return;
      }
    } else {
      setIsAutoAssign(false);
      setSelectedEmployee(employee);
    }
    setStep(4);
  };

  const handleFinalBooking = () => {
    if (!selectedBranch || !selectedEmployee || !selectedTime) return;
    
    dataService.addAppointment({
      branchId: selectedBranch.id,
      employeeId: selectedEmployee.id,
      date: selectedDate,
      time: selectedTime,
      clientName: clientName || 'Cliente Anónimo',
    });
    
    // Show success screen (simulated by step 5 or alert + redirect)
    alert('¡Cita Confirmada!');
    onBack();
  };

  // --- Render Steps ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800">Selecciona una Sucursal</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div 
            key={branch.id}
            onClick={() => handleBranchSelect(branch)}
            className="group cursor-pointer bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-500 transition-all overflow-hidden"
          >
            <div className="h-32 bg-gray-200 relative">
              <img src={branch.image} alt={branch.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600">{branch.name}</h3>
              <div className="flex items-center text-gray-500 text-sm mt-2">
                <MapPin className="w-4 h-4 mr-1" />
                {branch.address}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800">Fecha y Hora</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Cita</label>
          <input 
            type="date" 
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={handleDateChange}
            className="w-full md:w-auto p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Horarios Disponibles ({selectedDate})</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {HOURS_OF_OPERATION.map((hour) => {
              // Determine if ANY employee is available at this hour for the branch
              // This is a "global" availability check for the slot
              const anyAvailable = dataService.getAvailableEmployeesForSlot(selectedBranch!.id, selectedDate, hour).length > 0;
              
              const isSelected = selectedTime === hour;

              return (
                <button
                  key={hour}
                  disabled={!anyAvailable}
                  onClick={() => handleTimeSelect(hour)}
                  className={`
                    p-3 rounded-lg text-sm font-medium transition-all
                    ${isSelected 
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2' 
                      : anyAvailable 
                        ? 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-500 hover:text-indigo-600' 
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'}
                  `}
                >
                  {hour}:00
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">* Horarios sujetos a disponibilidad de los empleados.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          disabled={selectedTime === null} 
          onClick={confirmTimeAndProceed}
          className="w-full md:w-auto"
        >
          Continuar
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    // Get ALL employees for this branch to list them
    const allBranchEmployees = dataService.getEmployeesByBranch(selectedBranch!.id);

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800">Selecciona Profesional</h2>
        
        {/* Option 1: Any Professional */}
        <div 
          onClick={() => handleEmployeeSelect('any')}
          className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl cursor-pointer hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Cualquier Profesional</h3>
              <p className="text-sm text-gray-500">Asignaremos al mejor disponible para ti.</p>
            </div>
          </div>
          <div className="text-indigo-600 font-medium group-hover:translate-x-1 transition-transform">Seleccionar &rarr;</div>
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        {/* Option 2: Specific Professionals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allBranchEmployees.map(emp => {
            const isAvailable = dataService.isEmployeeAvailable(emp.id, selectedDate, selectedTime!);
            const nextSlot = !isAvailable ? dataService.getNextAvailableSlot(emp.id, selectedDate, selectedTime!) : null;

            return (
              <div 
                key={emp.id}
                className={`
                  relative border rounded-xl p-4 transition-all
                  ${isAvailable 
                    ? 'bg-white border-gray-200 hover:border-indigo-500 cursor-pointer hover:shadow-md' 
                    : 'bg-gray-50 border-gray-200 opacity-90'}
                `}
                onClick={() => {
                   if (isAvailable) handleEmployeeSelect(emp);
                }}
              >
                <div className="flex items-start gap-4">
                  <img src={emp.avatar} alt={emp.name} className={`w-14 h-14 rounded-full object-cover ${!isAvailable && 'grayscale'}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                    <p className="text-sm text-gray-500">{emp.role}</p>
                    
                    <div className="mt-2">
                      {isAvailable ? (
                        <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3 mr-1" /> Disponible
                        </span>
                      ) : (
                        <div className="space-y-1">
                           <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3 h-3 mr-1" /> Ocupado a las {selectedTime}:00
                          </span>
                          {nextSlot && (
                             <p className="text-xs text-indigo-600 mt-1 font-medium">
                               Siguiente hora libre: {nextSlot}:00
                             </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">Confirmar Cita</h2>
        <p className="text-gray-500">Por favor revisa los detalles antes de confirmar.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
           <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><MapPin size={20}/></div>
           <div>
             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sucursal</p>
             <p className="font-medium text-gray-900">{selectedBranch?.name}</p>
             <p className="text-sm text-gray-500">{selectedBranch?.address}</p>
           </div>
        </div>

        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
           <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Calendar size={20}/></div>
           <div>
             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Fecha y Hora</p>
             <p className="font-medium text-gray-900 text-lg">{selectedDate} <span className="text-gray-400">|</span> {selectedTime}:00</p>
           </div>
        </div>

        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
           <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><User size={20}/></div>
           <div>
             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Profesional</p>
             <div className="flex items-center gap-2">
                <img src={selectedEmployee?.avatar} className="w-6 h-6 rounded-full" alt="avatar"/>
                <p className="font-medium text-gray-900">
                    {selectedEmployee?.name} 
                    {isAutoAssign && <span className="text-xs text-gray-400 ml-2">(Asignado Automáticamente)</span>}
                </p>
             </div>
           </div>
        </div>

        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tu Nombre Completo</label>
          <input 
            type="text" 
            placeholder="Ej. Juan Pérez"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            autoFocus
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="secondary" fullWidth onClick={() => setStep(3)}>Atrás</Button>
        <Button fullWidth onClick={handleFinalBooking} disabled={!clientName.trim()}>Confirmar Reserva</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={step === 1 ? onBack : () => setStep(prev => (prev - 1) as Step)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-gray-800 text-lg">
                {step === 1 && 'Ubicación'}
                {step === 2 && 'Fecha'}
                {step === 3 && 'Profesional'}
                {step === 4 && 'Confirmación'}
            </h1>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default BookingWizard;
