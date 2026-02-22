import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, MapPin, User, CheckCircle, AlertCircle, Sparkles, Navigation, ExternalLink, Scissors, Locate, RefreshCw, ChevronRight, Clock, Star, Map, X } from 'lucide-react';
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

type Step = 1 | 2 | 3 | 4 | 5 | 6; // 0 removed, starts at 1

// --- Leaflet Icons Fix ---
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

// Helper Map Component
const RecenterAutomatically = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
};

const BookingWizard: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<Step>(1); // Start at Service Selection
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Data State
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<(Branch & { distance?: number })[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  
  // Availability State
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [availableEmployeeIds, setAvailableEmployeeIds] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Selection State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Client Form
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // UI State
  const [showMapModal, setShowMapModal] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
        const branches = await dataService.getBranches();
        const services = await dataService.getServices();
        setAllBranches(branches);
        setAllServices(services.filter(s => s.isActive)); // Changed from .active to .isActive based on schema
    };
    loadData();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Fetch Available Slots when Date/Branch/Service changes
  useEffect(() => {
      const fetchSlots = async () => {
          if (!selectedBranch || !selectedDate || !selectedService) return;
          setLoadingAvailability(true);
          const slots: number[] = [];
          for (const hour of HOURS_OF_OPERATION) {
              // This is N+1 but acceptable for MVP. Ideally backend returns all slots.
              const employees = await dataService.getAvailableEmployeesForSlot(selectedBranch.id, selectedDate, hour, selectedService.id);
              if (employees.length > 0) {
                  slots.push(hour);
              }
          }
          setAvailableSlots(slots);
          setLoadingAvailability(false);
      };
      fetchSlots();
  }, [selectedBranch, selectedDate, selectedService]);

  // Fetch Available Employees when Time changes
  useEffect(() => {
      const fetchEmployees = async () => {
          if (!selectedBranch || !selectedDate || !selectedTime || !selectedService) return;
          setLoadingAvailability(true);
          const employees = await dataService.getAvailableEmployeesForSlot(selectedBranch.id, selectedDate, selectedTime, selectedService.id);
          setAvailableEmployeeIds(employees.map(e => e.id));
          setLoadingAvailability(false);
      };
      fetchEmployees();
  }, [selectedBranch, selectedDate, selectedTime, selectedService]);

  // Filter Logic
  useEffect(() => {
    let relevantBranches = allBranches;
    if (selectedService) {
        // Check if branch has service. In schema it's many-to-many.
        // Frontend mock assumed branch.serviceIds.
        // We need to ensure Branch type has serviceIds or we filter differently.
        // The mock dataService.getBranches returns Branch which has serviceIds.
        // If we use real API, we need to make sure the response includes serviceIds or we fetch them.
        // For now assuming API returns compatible structure.
        relevantBranches = relevantBranches.filter(b => b.serviceIds && b.serviceIds.includes(selectedService.id));
    }
    
    if (userLocation) {
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; 
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

  const requestLocation = () => {
    if (!navigator.geolocation) {
        setLocationError("No soportado");
        return;
    }
    setLoadingLocation(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
            setLoadingLocation(false);
        },
        (error) => {
            console.warn(error);
            setLocationError("Error ubicación");
            setLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // --- Handlers ---
  const handleFinalBooking = async () => {
    if (!selectedBranch || !selectedEmployee || !selectedTime || !selectedService) return;
    const client = await dataService.getOrCreateClient(clientName, clientEmail, clientPhone);
    await dataService.addAppointment({
      branchId: selectedBranch.id,
      employeeId: selectedEmployee.id,
      serviceId: selectedService.id,
      clientId: client.id,
      date: selectedDate,
      time: selectedTime,
      clientName: clientName,
    });
    setStep(6); // Success Screen
  };

  // --- Render Functions ---

  const ProgressBar = () => {
      const progress = Math.min((step / 5) * 100, 100);
      return (
          <div className="w-full h-1 bg-gray-100 sticky top-0 z-20">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              />
          </div>
      );
  };

  // STEP 1: SERVICES
  const renderServices = () => (
      <div className="p-6 space-y-6 animate-fade-in pb-24">
          <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Elige un servicio</h2>
              <p className="text-gray-500">Selecciona el tratamiento que deseas realizarte hoy.</p>
          </div>

          <div className="space-y-4">
              {allServices.map(service => (
                  <div 
                    key={service.id}
                    onClick={() => { setSelectedService(service); setStep(2); }}
                    className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer flex items-center gap-4 active:scale-[0.98]"
                  >
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Scissors size={24} />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                              <h3 className="font-bold text-gray-900">{service.name}</h3>
                              <span className="font-bold text-indigo-600">${service.price}</span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">{service.description}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                              <Clock size={12} /> {service.duration} min
                          </div>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-indigo-500" />
                  </div>
              ))}
          </div>
      </div>
  );

  // STEP 2: BRANCHES
  const renderBranches = () => (
      <div className="p-6 space-y-6 animate-fade-in pb-24 h-full flex flex-col">
          <div className="flex justify-between items-start">
              <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">¿Dónde?</h2>
                  <p className="text-gray-500 text-sm">Sucursales con <span className="text-indigo-600 font-medium">{selectedService?.name}</span>.</p>
              </div>
              <button 
                onClick={requestLocation}
                className={`p-2 rounded-full border ${userLocation ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-500 border-gray-200'} `}
              >
                  {loadingLocation ? <RefreshCw size={20} className="animate-spin" /> : <Locate size={20} />}
              </button>
          </div>

          {locationError && <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded-lg flex items-center gap-2"><AlertCircle size={14}/> {locationError}</div>}

          <div className="flex-1 overflow-y-auto space-y-4">
              {filteredBranches.map(branch => (
                  <div 
                    key={branch.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => { setSelectedBranch(branch); setStep(3); }}
                  >
                      <div className="h-32 bg-gray-200 relative">
                          <img src={branch.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={branch.name} />
                          {branch.distance !== undefined && (
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm flex items-center gap-1">
                                  <Navigation size={10} className="text-indigo-600"/> {branch.distance.toFixed(1)} km
                              </div>
                          )}
                      </div>
                      <div className="p-4">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{branch.name}</h3>
                          <div className="flex items-start gap-2 text-sm text-gray-500 mb-3">
                              <MapPin size={16} className="shrink-0 mt-0.5" />
                              {branch.address}
                          </div>
                          <div className="flex gap-2">
                                <button 
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
                                >
                                    Seleccionar
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMapModal(true); }}
                                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                    <Map size={20} />
                                </button>
                          </div>
                      </div>
                  </div>
              ))}
              
              {filteredBranches.length === 0 && (
                  <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                      <p className="text-gray-500">No hay sucursales disponibles para este servicio.</p>
                      <Button variant="secondary" size="sm" className="mt-4" onClick={() => setStep(1)}>Cambiar Servicio</Button>
                  </div>
              )}
          </div>

          {/* Map Modal for Mobile */}
          {showMapModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white w-full max-w-lg h-[70vh] rounded-2xl overflow-hidden relative shadow-2xl">
                      <button onClick={() => setShowMapModal(false)} className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-full shadow-md hover:bg-gray-100"><X size={20}/></button>
                      <MapContainer center={userLocation ? [userLocation.lat, userLocation.lng] : [6.17, -75.60]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={iconPerson}><Popup>Tú</Popup></Marker>}
                        {filteredBranches.map(b => (
                            <Marker key={b.id} position={[b.lat, b.lng]} icon={iconBranch}>
                                <Popup>
                                    <strong>{b.name}</strong><br/>{b.address}<br/>
                                    <button onClick={() => { setSelectedBranch(b); setStep(3); setShowMapModal(false); }} className="mt-2 text-indigo-600 font-bold underline">Seleccionar</button>
                                </Popup>
                            </Marker>
                        ))}
                      </MapContainer>
                  </div>
              </div>
          )}
      </div>
  );

  // STEP 3: DATE & TIME
  const renderDateTime = () => (
      <div className="p-6 space-y-6 animate-fade-in pb-24">
          <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">¿Cuándo?</h2>
              <div className="flex gap-2 text-xs flex-wrap">
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">{selectedService?.name}</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md">@ {selectedBranch?.name}</span>
              </div>
          </div>

          <div className="space-y-6">
              <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Selecciona Fecha</label>
                  <div className="relative">
                      <input 
                          ref={dateInputRef}
                          type="date" 
                          value={selectedDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                          onClick={() => dateInputRef.current?.showPicker()} 
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium cursor-pointer appearance-none"
                      />
                      <Calendar 
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" 
                        size={20} 
                      />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Horarios Disponibles {loadingAvailability && <span className="text-xs font-normal text-indigo-500 animate-pulse">(Cargando...)</span>}</label>
                  <div className="grid grid-cols-4 gap-3">
                      {HOURS_OF_OPERATION.map(hour => {
                          const hasAvailability = availableSlots.includes(hour);
                          const isSelected = selectedTime === hour;
                          
                          return (
                              <button
                                key={hour}
                                disabled={!hasAvailability}
                                onClick={() => setSelectedTime(hour)}
                                className={`
                                    py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden
                                    ${isSelected 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                                        : hasAvailability 
                                            ? 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-500' 
                                            : 'bg-gray-50 text-gray-300 border border-transparent cursor-not-allowed'}
                                `}
                              >
                                  {hour}:00
                              </button>
                          )
                      })}
                  </div>
              </div>
          </div>
      </div>
  );

  // STEP 4: PROFESSIONAL
  const renderProfessional = () => {
    // We need to fetch employees for the branch. This is async in dataService but we loaded allBranches which has serviceIds.
    // However, we need the Employee objects.
    // We can assume we need to fetch them or we can use the ones we might have loaded if we loaded all employees.
    // But we didn't load all employees in initial load of BookingWizard.
    // We should probably fetch employees for the branch when branch is selected.
    // For now, let's use a new useEffect to load employees for the selected branch or just use the availableEmployeeIds which contains the full objects if we change getAvailableEmployeesForSlot to return objects.
    // dataService.getAvailableEmployeesForSlot returns Promise<Employee[]>.
    // So availableEmployeeIds should actually be availableEmployees (objects).
    
    // Let's check the state definition:
    // const [availableEmployeeIds, setAvailableEmployeeIds] = useState<string[]>([]);
    // It stores IDs.
    
    // We need the full employee objects to render.
    // We can fetch all employees for the branch when entering this step or just fetch them in the useEffect.
    
    const [branchEmployees, setBranchEmployees] = useState<Employee[]>([]);
    
    useEffect(() => {
        if (selectedBranch) {
            dataService.getEmployeesByBranch(selectedBranch.id).then(setBranchEmployees);
        }
    }, [selectedBranch]);

    const eligibleEmployees = branchEmployees.filter(e => e.serviceIds.includes(selectedService!.id));

    return (
        <div className="p-6 space-y-6 animate-fade-in pb-24">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">¿Con quién?</h2>
                <p className="text-gray-500 text-sm">Elige tu profesional preferido.</p>
            </div>

            <div 
                onClick={() => { setSelectedEmployee({ id: 'any', name: 'Cualquiera' } as Employee); setStep(5); }}
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-2xl cursor-pointer hover:shadow-md transition-all mb-6"
            >
                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                    <Sparkles size={24}/>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Cualquier Profesional</h3>
                    <p className="text-xs text-indigo-600 font-medium">Asignación automática rápida</p>
                </div>
                <ChevronRight className="ml-auto text-indigo-300"/>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">Especialistas {loadingAvailability && <span className="text-xs font-normal text-indigo-500 animate-pulse">(Verificando...)</span>}</h3>
                {eligibleEmployees.map(emp => {
                    const isAvailable = availableEmployeeIds.includes(emp.id);
                    return (
                        <div
                            key={emp.id}
                            onClick={() => { if(isAvailable) { setSelectedEmployee(emp); setStep(5); } }}
                            className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isAvailable ? 'bg-white border-gray-100 cursor-pointer hover:border-indigo-500 hover:shadow-sm' : 'bg-gray-50 border-transparent opacity-60 grayscale'}`}
                        >
                            <img src={emp.avatarUrl || emp.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt={emp.name} />
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{emp.name}</h4>
                                <p className="text-xs text-gray-500">{emp.roleLabel || emp.role}</p>
                            </div>
                            {isAvailable ? (
                                <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-indigo-600">
                                    <div className="w-3 h-3 rounded-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            ) : (
                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Ocupado</span>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
  };

  // STEP 5: FORM
  const renderForm = () => (
      <div className="p-6 space-y-6 animate-fade-in pb-32">
          <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Tus Datos</h2>
              <p className="text-gray-500 text-sm">Solo falta este paso para confirmar.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              {/* Summary Card */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-50">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      <img src={selectedBranch?.image} className="w-full h-full object-cover" />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-900">{selectedService?.name}</h3>
                      <p className="text-sm text-gray-500">{selectedBranch?.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs font-medium text-indigo-600">
                          <span className="bg-indigo-50 px-2 py-0.5 rounded">{selectedDate}</span>
                          <span className="bg-indigo-50 px-2 py-0.5 rounded">{selectedTime}:00</span>
                      </div>
                  </div>
              </div>

              <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nombre Completo</label>
                      <input 
                        value={clientName} 
                        onChange={e => setClientName(e.target.value)} 
                        placeholder="Ej. Ana Pérez"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Teléfono</label>
                      <input 
                        value={clientPhone} 
                        onChange={e => setClientPhone(e.target.value)} 
                        placeholder="Ej. 300 123 4567"
                        type="tel"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Correo Electrónico</label>
                      <input 
                        value={clientEmail} 
                        onChange={e => setClientEmail(e.target.value)} 
                        placeholder="tucorreo@ejemplo.com"
                        type="email"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                  </div>
              </div>
          </div>
      </div>
  );

  // STEP 6: SUCCESS
  const renderSuccess = () => (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in bg-white">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
              <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Cita Confirmada!</h2>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">
              Te hemos enviado los detalles a <strong>{clientEmail}</strong>. Nos vemos pronto.
          </p>

          <div className="w-full max-w-xs bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 shadow-inner">
               <div className="text-sm text-gray-500 mb-1">Tu código de reserva</div>
               <div className="text-2xl font-mono font-bold text-gray-900 tracking-widest">AG-{Math.floor(Math.random()*10000)}</div>
          </div>

          <div className="space-y-3 w-full max-w-xs">
              <Button fullWidth onClick={onBack}>Volver al Inicio</Button>
              <Button fullWidth variant="secondary" onClick={() => window.print()}>Guardar Comprobante</Button>
          </div>
      </div>
  );

  // --- Main Render Container ---
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-start">
        {/* Mobile-First Container: Full width on mobile, centered card on desktop */}
        <div className="w-full md:max-w-[480px] bg-white min-h-screen md:min-h-[800px] md:h-auto md:my-8 md:rounded-[32px] md:shadow-2xl md:border md:border-gray-100 relative overflow-hidden flex flex-col">
            
            {/* Header (Sticky) */}
            {step < 6 && (
                <div className="sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b border-gray-100">
                    <ProgressBar />
                    <div className="flex items-center justify-between p-4">
                        <button 
                            onClick={() => step === 1 ? onBack() : setStep(step - 1 as Step)} 
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                            {step === 1 && 'Servicios'}
                            {step === 2 && 'Ubicación'}
                            {step === 3 && 'Fecha'}
                            {step === 4 && 'Profesional'}
                            {step === 5 && 'Confirmar'}
                        </span>
                        <div className="w-10"></div> {/* Spacer for alignment */}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto relative scroll-smooth">
                {step === 1 && renderServices()}
                {step === 2 && renderBranches()}
                {step === 3 && renderDateTime()}
                {step === 4 && renderProfessional()}
                {step === 5 && renderForm()}
                {step === 6 && renderSuccess()}
            </div>

            {/* Floating Action Button for Next Steps (Only 3, 4, 5) */}
            {(step === 3 || step === 5) && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-40">
                    <Button 
                        fullWidth 
                        size="lg" 
                        disabled={
                            (step === 3 && (!selectedDate || selectedTime === null)) || 
                            (step === 5 && (!clientName || !clientPhone))
                        }
                        onClick={() => {
                            if (step === 3) setStep(4);
                            if (step === 5) handleFinalBooking();
                        }}
                        className="shadow-xl shadow-indigo-200 py-4 text-lg rounded-2xl"
                    >
                        {step === 5 ? 'Confirmar Reserva' : 'Continuar'}
                    </Button>
                </div>
            )}
        </div>
    </div>
  );
};

export default BookingWizard;