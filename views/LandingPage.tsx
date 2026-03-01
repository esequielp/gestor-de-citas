import React, { useState, useEffect } from 'react';
import { Menu, X, Instagram, Facebook, Twitter, MapPin, Phone, Mail, Clock, Calendar, Star, ArrowRight, Scissors, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../components/Button';
import { dataService } from '../services/dataService';
import { Service, Branch, ViewState } from '../types';
// @ts-ignore
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// @ts-ignore
import L from 'leaflet';

// Fix icons (reusing the fix from BookingWizard)
const iconBranch = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Props {
  onNavigate: (view: ViewState, serviceId?: string) => void;
}

const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allServices, allBranches, companyInfo] = await Promise.all([
          dataService.getServices(),
          dataService.getBranches(),
          dataService.getCompanyInfo()
        ]);

        if (Array.isArray(allServices)) {
          console.log("Servicios cargados:", allServices.length, allServices[0]);
          setServices(allServices.filter(s => s.active || (s as any).activo).slice(0, 6));
        }
        if (Array.isArray(allBranches)) {
          setBranches(allBranches);
        }
        setCompany(companyInfo);
      } catch (e) {
        console.error("Error loading landing data:", e);
      }
    };
    loadData();
  }, []);

  const scrollTo = (id: string) => {
    setIsMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="font-sans text-gray-800 bg-white">
      {/* --- HEADER --- */}
      <header className="fixed w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">
                <Scissors size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight uppercase">
                  {company?.nombre ? company.nombre.split(' ')[0] : 'Estilo'}
                  <span className="text-indigo-600">
                    {company?.nombre ? company.nombre.split(' ').slice(1).join(' ') : 'Pro'}
                  </span>
                </h1>
                <p className="text-[10px] text-gray-500 tracking-widest uppercase -mt-1">
                  {company?.nombre ? 'Salón & Spa' : 'Beauty & Spa'}
                </p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
              <button onClick={() => scrollTo('inicio')} className="hover:text-indigo-600 transition-colors">Inicio</button>
              <button onClick={() => scrollTo('servicios')} className="hover:text-indigo-600 transition-colors">Servicios</button>
              <button onClick={() => scrollTo('nosotros')} className="hover:text-indigo-600 transition-colors">Nosotros</button>
              <button onClick={() => scrollTo('sedes')} className="hover:text-indigo-600 transition-colors">Sucursales</button>
              <button onClick={() => scrollTo('contacto')} className="hover:text-indigo-600 transition-colors">Contacto</button>
            </nav>

            {/* CTA & Mobile Toggle */}
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <Button onClick={() => onNavigate('BOOKING')} className="rounded-full px-6 shadow-lg shadow-indigo-200">
                  Reservar Cita
                </Button>
              </div>
              <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 absolute w-full left-0 top-20 p-4 flex flex-col gap-4 shadow-xl animate-fade-in">
            <button onClick={() => scrollTo('inicio')} className="text-left p-2 hover:bg-gray-50 rounded">Inicio</button>
            <button onClick={() => scrollTo('servicios')} className="text-left p-2 hover:bg-gray-50 rounded">Servicios</button>
            <button onClick={() => scrollTo('nosotros')} className="text-left p-2 hover:bg-gray-50 rounded">Nosotros</button>
            <button onClick={() => scrollTo('sedes')} className="text-left p-2 hover:bg-gray-50 rounded">Sucursales</button>
            <button onClick={() => scrollTo('contacto')} className="text-left p-2 hover:bg-gray-50 rounded">Contacto</button>
            <Button onClick={() => onNavigate('BOOKING')} fullWidth className="mt-2">Reservar Cita</Button>
          </div>
        )}
      </header>

      {/* --- HERO SECTION --- */}
      <section id="inicio" className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
            alt="Salon Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6 text-white animate-fade-in-up">
          <span className="inline-block py-1 px-3 border border-white/30 rounded-full text-xs font-semibold tracking-wider uppercase bg-white/10 backdrop-blur-sm">
            Experiencia Premium
          </span>
          <h2 className="text-5xl md:text-7xl font-bold leading-tight">
            Realza tu belleza,<br />
            <span className="text-indigo-400 font-serif italic">renueva tu estilo</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto font-light">
            Expertos en cuidado personal, estilismo y bienestar. Déjate consentir por los mejores profesionales de la ciudad.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => onNavigate('BOOKING')} size="lg" className="rounded-full px-8 py-4 text-lg bg-indigo-600 hover:bg-indigo-700 border-none">
              Agendar Cita Ahora
            </Button>
            <button
              onClick={() => scrollTo('servicios')}
              className="px-8 py-4 rounded-full border border-white text-white hover:bg-white hover:text-black transition-all font-medium backdrop-blur-sm"
            >
              Ver Servicios
            </button>
          </div>
        </div>
      </section>

      {/* --- SERVICES SECTION --- */}
      <section id="servicios" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h3 className="text-indigo-600 font-semibold uppercase tracking-wider text-sm">Nuestros Tratamientos</h3>
            <h2 className="text-4xl font-bold text-gray-900">Menú de Servicios</h2>
            <div className="w-24 h-1 bg-indigo-600 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              // Extract first image if it's a JSON array, or use the single URL
              let imageUrl = '';
              try {
                if (service.image && service.image.startsWith('[')) {
                  const imgs = JSON.parse(service.image);
                  if (imgs.length > 0) imageUrl = imgs[0];
                } else if (service.image) {
                  imageUrl = service.image;
                }
              } catch (e) { }

              return (
                <div key={service.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 group flex flex-col h-full">
                  {imageUrl ? (
                    <div className="w-full h-48 mb-4 rounded-xl overflow-hidden bg-gray-100">
                      <img src={imageUrl} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                        <Scissors className="w-6 h-6 text-gray-900 group-hover:text-white" />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex-1 pr-4">
                      {service.name || (service as any).nombre || 'Servicio'}
                    </h4>
                    <span className="font-serif text-2xl font-bold text-indigo-600">
                      ${service.price ?? (service as any).precio ?? '0'}
                    </span>
                  </div>

                  <p className="text-gray-500 mb-6 leading-relaxed line-clamp-4 text-sm flex-1">
                    {service.description || (service as any).descripcion || 'Sin descripción disponible'}
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock size={16} /> {service.duration} min
                    </span>
                    <button onClick={() => onNavigate('SERVICE_DETAILS', service.id)} className="text-indigo-600 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all">
                      Más Info <ChevronRight size={16} />
                    </button>
                    <button onClick={() => onNavigate('BOOKING', service.id)} className="text-white font-semibold text-sm bg-indigo-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-700 hover:shadow-lg transition-all border border-indigo-700">
                      Agendar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-12">
            <Button variant="secondary" onClick={() => onNavigate('BOOKING')} className="rounded-full">Ver todos los servicios</Button>
          </div>
        </div>
      </section>

      {/* --- ABOUT US --- */}
      <section id="nosotros" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-indigo-100 rounded-full z-0"></div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-indigo-50 rounded-full z-0"></div>
              <img
                src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="Our Team"
                className="relative z-10 rounded-2xl shadow-2xl object-cover h-[500px] w-full"
              />
              <div className="absolute bottom-8 left-8 z-20 bg-white p-6 rounded-xl shadow-lg max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="font-bold text-gray-900">"El mejor servicio que he recibido. Totalmente recomendado."</p>
                <p className="text-xs text-gray-500 mt-2">— Cliente Feliz</p>
              </div>
            </div>

            <div className="lg:w-1/2 space-y-6">
              <h3 className="text-indigo-600 font-semibold uppercase tracking-wider text-sm">Sobre Nosotros</h3>
              <h2 className="text-4xl font-bold text-gray-900 font-serif">Pasión por el detalle y la excelencia</h2>
              <p className="text-gray-500 text-lg leading-relaxed">
                Desde 2015, EstiloPro se ha dedicado a ofrecer experiencias de belleza transformadoras. Nuestro equipo de estilistas master combina técnicas vanguardistas con productos de la más alta calidad para garantizar resultados espectaculares.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="border-l-4 border-indigo-200 pl-4">
                  <span className="block text-3xl font-bold text-gray-900">5k+</span>
                  <span className="text-gray-500">Clientes Felices</span>
                </div>
                <div className="border-l-4 border-indigo-200 pl-4">
                  <span className="block text-3xl font-bold text-gray-900">10+</span>
                  <span className="text-gray-500">Años de Experiencia</span>
                </div>
              </div>
              <div className="pt-6">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png" className="h-12 w-auto object-contain opacity-50 grayscale" alt="Brands" />
                {/* Placeholder for brands/partners logos if needed */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section id="testimonios" className="py-24 bg-gray-50 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h3 className="text-indigo-600 font-semibold uppercase tracking-wider text-sm border border-indigo-200 inline-block px-4 py-1 rounded-full bg-indigo-50">Casos de Éxito</h3>
            <h2 className="text-4xl font-bold text-gray-900">Lo que dicen nuestros clientes</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Experiencias reales de personas que ya dieron el paso hacia su mejor versión.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative z-10">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-shadow relative">
              <div className="text-6xl text-indigo-100 absolute top-4 right-6 font-serif leading-none">"</div>
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-gray-700 italic mb-6">"Los resultados superaron mis expectativas. Desde el momento que haces la reserva hasta que terminas, te hacen sentir como realeza. Totalmente recomendado."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold overflow-hidden"><img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" alt="Avatar" /></div>
                <div>
                  <h4 className="font-bold text-gray-900">María Camila R.</h4>
                  <p className="text-xs text-gray-500">Transformación Complete</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-indigo-600 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-shadow relative transform md:-translate-y-4">
              <div className="text-6xl text-indigo-400 absolute top-4 right-6 font-serif leading-none">"</div>
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-white italic mb-6">"El profesionalismo es de otro nivel. Las instalaciones, la atención, todo es premium. Me volví cliente fiel en la primera cita y el trato es inmejorable."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold overflow-hidden"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="Avatar" /></div>
                <div>
                  <h4 className="font-bold text-white">Roberto Sánchez</h4>
                  <p className="text-xs text-indigo-200">Experiencia Premium</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-shadow relative">
              <div className="text-6xl text-indigo-100 absolute top-4 right-6 font-serif leading-none">"</div>
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-gray-700 italic mb-6">"Nunca había tenido una experiencia tan buena ni agendado tan fácil. Me orientaron perfectamente e incluso me recomendaron exactamente lo que necesitaba."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold overflow-hidden"><img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80" alt="Avatar" /></div>
                <div>
                  <h4 className="font-bold text-gray-900">Ana Orozco</h4>
                  <p className="text-xs text-gray-500">Renovación de Look</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Button onClick={() => onNavigate('BOOKING')} size="lg" className="rounded-full px-8 py-4 bg-indigo-900 shadow-xl hover:scale-105 transition-transform"><Sparkles className="inline mr-2" size={18} /> Únete a ellos y experimenta la calidad</Button>
          </div>
        </div>
      </section>

      {/* --- BRANCHES & MAP --- */}
      <section id="sedes" className="py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/3 space-y-8">
              <div>
                <h3 className="text-indigo-400 font-semibold uppercase tracking-wider text-sm mb-2">Ubicaciones</h3>
                <h2 className="text-4xl font-bold mb-4">Encuéntranos</h2>
                <p className="text-gray-400">Visítanos en cualquiera de nuestras sucursales exclusivas.</p>
              </div>

              <div className="space-y-4">
                {branches.map((branch) => (
                  <div key={branch.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-indigo-500 transition-colors cursor-default">
                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <MapPin className="text-indigo-400" size={18} /> {branch.name}
                    </h4>
                    <p className="text-gray-400 text-sm ml-6 mb-3">{branch.address}</p>
                    <div className="ml-6 flex gap-3 text-sm">
                      <a href={`https://maps.google.com/?q=${branch.lat},${branch.lng}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-white underline">Cómo llegar</a>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-400">Lun - Sab: 8am - 7pm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:w-2/3 h-[500px] bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
              <MapContainer center={[6.17, -75.60]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {branches.filter(b => b.lat != null && b.lng != null).map(b => (
                  <Marker key={b.id} position={[b.lat, b.lng]} icon={iconBranch}>
                    <Popup>
                      <strong className="text-gray-900">{b.name}</strong><br />
                      <span className="text-gray-600">{b.address}</span>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT --- */}
      <section id="contacto" className="py-24 bg-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Contáctanos</h2>
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Phone size={20} />
                </div>
                <h4 className="font-bold text-gray-900">Llámanos</h4>
                <p className="text-sm text-gray-500">+57 300 123 4567</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Mail size={20} />
                </div>
                <h4 className="font-bold text-gray-900">Escríbenos</h4>
                <p className="text-sm text-gray-500">citas@estilopro.com</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path></svg>
                </div>
                <h4 className="font-bold text-gray-900">WhatsApp</h4>
                <p className="text-sm text-gray-500">Chat Directo</p>
              </div>
            </div>

            <form
              className="space-y-4 text-left"
              onSubmit={async (e) => {
                e.preventDefault();
                setContactStatus('loading');
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const email = formData.get('email') as string;
                const message = formData.get('message') as string;

                if (!name || !email || !message) {
                  setContactStatus('error');
                  return;
                }

                try {
                  await dataService.saveMessage({
                    empresaId: company?.id || 'demo',
                    nombre: name,
                    email: email,
                    text: message,
                    via: 'WEB_CONTACT'
                  });
                  setContactStatus('success');
                  (e.target as HTMLFormElement).reset();
                  setTimeout(() => setContactStatus('idle'), 5000);
                } catch (err) {
                  setContactStatus('error');
                  setTimeout(() => setContactStatus('idle'), 5000);
                }
              }}
            >
              {contactStatus === 'success' && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 mb-4 animate-fade-in">
                  <span className="font-medium">¡Gracias! Tu mensaje ha sido enviado.</span>
                </div>
              )}
              {contactStatus === 'error' && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 mb-4 animate-fade-in">
                  <span className="font-medium">Hubo un error al enviar el mensaje. Inténtalo de nuevo.</span>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">NOMBRE</label>
                  <input name="name" type="text" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">EMAIL</label>
                  <input name="email" type="email" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="tucorreo@ejemplo.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">MENSAJE</label>
                <textarea name="message" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="¿En qué podemos ayudarte?"></textarea>
              </div>
              <Button fullWidth size="lg" type="submit" disabled={contactStatus === 'loading'}>
                {contactStatus === 'loading' ? 'Enviando...' : 'Enviar Mensaje'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 border-b border-gray-800 pb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center">
                  <Scissors size={16} />
                </div>
                <h3 className="text-xl font-bold text-white uppercase">
                  {company?.nombre || 'EstiloPro'}
                </h3>
              </div>
              <p className="text-gray-500 max-w-sm mb-6">
                Transformamos tu imagen con pasión y profesionalismo. Visítanos en cualquiera de nuestras sedes y vive la experiencia.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors"><Instagram size={18} /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"><Facebook size={18} /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-sky-500 transition-colors"><Twitter size={18} /></a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Enlaces Rápidos</h4>
              <ul className="space-y-3">
                <li><button onClick={() => scrollTo('inicio')} className="hover:text-white transition-colors">Inicio</button></li>
                <li><button onClick={() => scrollTo('servicios')} className="hover:text-white transition-colors">Servicios</button></li>
                <li><button onClick={() => scrollTo('nosotros')} className="hover:text-white transition-colors">Nosotros</button></li>
                <li><button onClick={() => onNavigate('BOOKING')} className="hover:text-white transition-colors">Reservar</button></li>
                <li><button onClick={() => onNavigate('ADMIN_LOGIN')} className="hover:text-white transition-colors">Acceso Staff</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Horarios</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li className="flex justify-between"><span>Lunes - Viernes</span> <span className="text-white">8am - 7pm</span></li>
                <li className="flex justify-between"><span>Sábados</span> <span className="text-white">9am - 6pm</span></li>
                <li className="flex justify-between"><span>Domingos</span> <span className="text-white">Cerrado</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} {company?.nombre || 'EstiloPro'}. Todos los derechos reservados.</p>
            <div className="flex gap-6 items-center">
              <button onClick={() => onNavigate('B2B_LANDING')} className="hover:text-white text-indigo-400 font-medium">Software para tu negocio</button>
              <a href="#" className="hover:text-white">Política de Privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;