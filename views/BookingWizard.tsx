import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, MapPin, User, CheckCircle, AlertCircle, Sparkles, Navigation, ExternalLink, Scissors } from 'lucide-react';
import { Branch, Employee, Service } from '../types';
import { dataService } from '../services/dataService';
import { HOURS_OF_OPERATION } from '../constants';
import { Button } from '../components/Button';
// @ts-ignore
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// @ts-ignore
import L from 'leaflet';

interface Props {
  onBack: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

// Fix for default Leaflet icons in Webpack/Vite/ESM environments
const iconPerson = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const iconBranch = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to recenter map when user location changes
const RecenterAutomatically = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

const BookingWizard: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<Step>(1);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<(Branch & { distance?: number })[]>([]);
  
  // Selection State
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAutoAssign, setIsAutoAssign] = useState(false);
  
  // Client Form
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Geolocation State
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');

  // Initial Data Load
  useEffect(() => {
    setAllBranches(dataService.getBranches());
    setAllServices(dataService.getServices().filter(s => s.active)); // Only active services
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);

    // Request Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.warn("Geolocation denied or error", error);
                setLocationError("No se pudo obtener tu ubicación.");
            }
        );
    } else {
        setLocationError("Tu navegador no soporta geolocalización.");
    }
  }, []);

  // Update filtered branches based on selected service AND location
  useEffect(() => {
    let relevantBranches = allBranches;

    // Filter by Service if selected
    if (selectedService) {
        relevantBranches = relevantBranches.filter(b => b.serviceIds.includes(selectedService.id));
    }

    // Calculate Distances
    if (userLocation) {
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        const sorted = relevantBranches.map(b => ({
            ...b,
            distance: calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        
        setFilteredBranches(sorted);
    } else {
        setFilteredBranches(relevantBranches);
    }
  }, [selectedService, userLocation, allBranches]);

  // --- Handlers ---

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Reset downstream selections
    setSelectedBranch(null);
    setSelectedTime(null);
    setSelectedEmployee(null);
    setStep(2);
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    // Reset downstream selections
    setSelectedTime(null);
    setSelectedEmployee(null);
    setStep(3);
  };

  const handleTimeSelect = (time: number) => {
    setSelectedTime(time);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedTime(null);
  };

  const confirmTimeAndProceed = () => {
    if (selectedTime !== null && selectedDate) {
      setStep(4);
    }
  };

  const handleEmployeeSelect = (employee: Employee | 'any') => {
    if (employee === 'any') {
      setIsAutoAssign(true);
      // Pick first available who performs this service
      const anyAvailable = dataService.getAvailableEmployeesForSlot(
        selectedBranch!.id, 
        selectedDate, 
        selectedTime!, 
        selectedService!.id
      );

      if (anyAvailable.length > 0) {
        setSelectedEmployee(anyAvailable[0]);
      } else {
        alert('Error: No hay empleados disponibles para este servicio en este horario.');
        return;
      }
    } else {
      setIsAutoAssign(false);
      setSelectedEmployee(employee);
    }
    setStep(5);
  };

  const handleFinalBooking = () => {
    if (!selectedBranch || !selectedEmployee || !selectedTime || !selectedService) return;
    
    // Create or Get Client
    const client = dataService.getOrCreateClient(clientName, clientEmail, clientPhone);

    dataService.addAppointment({
      branchId: selectedBranch.id,
      employeeId: selectedEmployee.id,
      serviceId: selectedService.id,
      clientId: client.id,
      date: selectedDate,
      time: selectedTime,
      clientName: clientName,
    });
    
    alert('¡Cita Confirmada!');
    onBack();
  };

  // --- Render Steps ---

  // STEP 1: SERVICE SELECTION
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800">¿Qué servicio necesitas?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allServices.map((service) => (
          <div 
            key={service.id}
            onClick={() => handleServiceSelect(service)}
            className="group cursor-pointer bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-500 transition-all flex justify-between items-center"
          >
              <div>
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-indigo-600">{service.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{service.description}</p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">{service.duration} min</span>
                  <span className="font-semibold text-gray-900">${service.price}</span>
                </div>
              </div>
              <div className="text-gray-300 group-hover:text-indigo-500">
                <Scissors size={24} />
              </div>
          </div>
        ))}
      </div>
    </div>
  );

  // STEP 2: BRANCH SELECTION (Filtered by Service)
  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Elige una Sucursal</h2>
            <p className="text-gray-500 text-sm">Mostrando sedes con el servicio: <span className="font-semibold text-indigo-600">{selectedService?.name}</span></p>
        </div>
        {locationError && <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{locationError}</span>}
      </div>

      {filteredBranches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
             <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-gray-800">Lo sentimos</h3>
             <p className="text-gray-500">Este servicio no está disponible en ninguna sucursal actualmente.</p>
             <Button variant="secondary" className="mt-4" onClick={() => setStep(1)}>Volver a Servicios</Button>
          </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Map Section */}
            <div className="w-full lg:w-1/2 h-64 lg:h-auto min-h-[300px] rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
                <MapContainer center={[6.17, -75.60]} zoom={12} scrollWheelZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* User Location Marker */}
                    {userLocation && (
                        <>
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={iconPerson}>
                                <Popup>¡Estás aquí!</Popup>
                            </Marker>
                            <RecenterAutomatically lat={userLocation.lat} lng={userLocation.lng} />
                        </>
                    )}

                    {/* Branch Markers */}
                    {filteredBranches.map(branch => (
                        <Marker key={branch.id} position={[branch.lat, branch.lng]} icon={iconBranch}>
                            <Popup>
                                <div className="p-1">
                                    <strong className="block text-sm mb-1">{branch.name}</strong>
                                    <span className="text-xs text-gray-500 block mb-2">{branch.address}</span>
                                    <button 
                                        onClick={() => handleBranchSelect(branch)}
                                        className="mt-2 w-full bg-indigo-600 text-white text-xs py-1 rounded hover:bg-indigo-700"
                                    >
                                        Seleccionar
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* List Section */}
            <div className="w-full lg:w-1/2 space-y-4 overflow-y-auto max-h-[600px] pr-2">
                {filteredBranches.map((branch) => (
                <div 
                    key={branch.id}
                    onClick={() => handleBranchSelect(branch)}
                    className="group cursor-pointer bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-500 transition-all overflow-hidden flex flex-row h-32"
                >
                    <div className="w-32 bg-gray-200 relative shrink-0">
                    <img src={branch.image} alt={branch.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4 flex flex-col justify-center flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-1">{branch.name}</h3>
                        {branch.distance !== undefined && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <Navigation size={10} /> {branch.distance.toFixed(1)} km
                            </span>
                        )}
                    </div>
                    <div className="flex items-center text-gray-500 text-xs mt-1 mb-2">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1">{branch.address}</span>
                    </div>
                    <div className="flex gap-2 mt-auto">
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-600 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-50 flex items-center gap-1"
                        >
                            Mapa <ExternalLink size={10}/>
                        </a>
                        <span className="ml-auto text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Seleccionar &rarr;</span>
                    </div>
                    </div>
                </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );

  // STEP 3: DATE & TIME
  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-800">Fecha y Hora</h2>
        <div className="flex gap-2 text-sm text-gray-500">
             <span className="bg-gray-100 px-2 py-1 rounded">{selectedService?.name}</span>
             <span className="bg-gray-100 px-2 py-1 rounded">{selectedBranch?.name}</span>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Cita</label>
          <input 
            type="date" 
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={handleDateChange}
            className="w-full md:w-auto p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Horarios Disponibles ({selectedDate})</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {HOURS_OF_OPERATION.map((hour) => {
              // Determine if ANY employee is available at this hour for the branch AND service
              const anyAvailable = dataService.getAvailableEmployeesForSlot(
                selectedBranch!.id, 
                selectedDate, 
                hour, 
                selectedService!.id
              ).length > 0;
              
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
          <p className="text-xs text-gray-500 mt-2">* Horarios sujetos a disponibilidad de personal para el servicio seleccionado.</p>
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

  // STEP 4: PROFESSIONAL
  const renderStep4 = () => {
    // Get employees filtered by branch AND service capability
    const eligibleEmployees = dataService.getEmployeesByBranch(selectedBranch!.id)
                                         .filter(e => e.serviceIds.includes(selectedService!.id));

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800">Selecciona Profesional</h2>
        
        {eligibleEmployees.length === 0 ? (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">No hay profesionales configurados para este servicio en esta sucursal.</div>
        ) : (
          <>
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
              {eligibleEmployees.map(emp => {
                // Check availability SPECIFICALLY for the selected service context
                const isAvailable = dataService.isEmployeeAvailable(emp.id, selectedDate, selectedTime!, selectedService!.id);
                const nextSlot = !isAvailable ? dataService.getNextAvailableSlot(emp.id, selectedDate, selectedTime!, selectedService!.id) : null;

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
          </>
        )}
      </div>
    );
  };

  // STEP 5: CONFIRMATION
  const renderStep5 = () => (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">Confirmar Cita</h2>
        <p className="text-gray-500">Por favor completa tus datos para finalizar.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4">
        {/* Summary Info */}
        <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-gray-100">
             <div>
                 <p className="text-xs text-gray-500 uppercase font-bold">Servicio</p>
                 <p className="font-medium text-gray-900">{selectedService?.name}</p>
            </div>
            <div>
                 <p className="text-xs text-gray-500 uppercase font-bold">Sucursal</p>
                 <p className="font-medium text-gray-900">{selectedBranch?.name}</p>
            </div>
            <div>
                 <p className="text-xs text-gray-500 uppercase font-bold">Fecha/Hora</p>
                 <p className="font-medium text-gray-900">{selectedDate} - {selectedTime}:00</p>
            </div>
            <div>
                 <p className="text-xs text-gray-500 uppercase font-bold">Profesional</p>
                 <p className="font-medium text-gray-900">{selectedEmployee?.name}</p>
            </div>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input 
                type="text" 
                placeholder="Ej. Juan Pérez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input 
                type="text" 
                placeholder="Ej. 555-1234"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
                type="email" 
                placeholder="ejemplo@correo.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="secondary" fullWidth onClick={() => setStep(4)}>Atrás</Button>
        <Button fullWidth onClick={handleFinalBooking} disabled={!clientName.trim() || !clientPhone.trim()}>Confirmar Reserva</Button>
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
            <h1 className="font-bold text-gray-800 text-lg hidden sm:block">
                {step === 1 && 'Seleccionar Servicio'}
                {step === 2 && 'Seleccionar Sucursal'}
                {step === 3 && 'Seleccionar Fecha'}
                {step === 4 && 'Seleccionar Profesional'}
                {step === 5 && 'Confirmación'}
            </h1>
            <h1 className="font-bold text-gray-800 text-lg sm:hidden">
               Paso {step} de 5
            </h1>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>
    </div>
  );
};

export default BookingWizard;