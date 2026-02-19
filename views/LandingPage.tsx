import React from 'react';
import { Calendar, CheckCircle, MapPin, Smartphone, Clock, Shield, Users, Star, Menu, X } from 'lucide-react';
import { Button } from '../components/Button';

interface Props {
  onNavigate: (view: 'BOOKING' | 'ADMIN_LOGIN') => void;
}

const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Calendar className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                AgendaPro
              </span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('beneficios')} className="text-gray-600 hover:text-indigo-600 transition-colors">Beneficios</button>
              <button onClick={() => scrollToSection('como-funciona')} className="text-gray-600 hover:text-indigo-600 transition-colors">Cómo funciona</button>
              <button onClick={() => scrollToSection('funcionalidades')} className="text-gray-600 hover:text-indigo-600 transition-colors">Funcionalidades</button>
              <button onClick={() => onNavigate('ADMIN_LOGIN')} className="text-gray-600 hover:text-indigo-600 font-medium">
                Acceso Admin
              </button>
              <Button onClick={() => onNavigate('BOOKING')} size="sm">
                Reservar Cita
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 p-4 space-y-4">
             <button onClick={() => scrollToSection('beneficios')} className="block w-full text-left text-gray-600 py-2">Beneficios</button>
             <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left text-gray-600 py-2">Cómo funciona</button>
             <button onClick={() => scrollToSection('funcionalidades')} className="block w-full text-left text-gray-600 py-2">Funcionalidades</button>
             <button onClick={() => onNavigate('ADMIN_LOGIN')} className="block w-full text-left text-indigo-600 font-medium py-2">Acceso Admin</button>
             <Button fullWidth onClick={() => onNavigate('BOOKING')}>Reservar Cita</Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
            <Star className="w-4 h-4 fill-current" />
            <span>Sistema #1 en Gestión de Citas</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Gestiona tus citas de forma <br/>
            <span className="text-indigo-600">simple y profesional</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-500">
            La plataforma definitiva de agendamiento para negocios con múltiples sucursales y empleados. Centraliza tu operación y mejora la experiencia de tus clientes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="lg" onClick={() => onNavigate('BOOKING')} className="min-w-[200px] shadow-xl shadow-indigo-200">
              Probar Demo
            </Button>
            <Button variant="secondary" size="lg" onClick={() => onNavigate('BOOKING')} className="min-w-[200px]">
              Reservar una cita
            </Button>
          </div>
          
          {/* Mockup Image */}
          <div className="mt-16 relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-indigo-600 blur-3xl opacity-20 rounded-full transform scale-90"></div>
            <img 
              src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
              alt="Dashboard Preview" 
              className="relative rounded-2xl shadow-2xl border-4 border-white/50 w-full object-cover h-[400px] sm:h-[600px] object-top"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">¿Por qué elegir AgendaPro?</h2>
            <p className="mt-4 text-gray-500">Todo lo que necesitas para escalar tu negocio de servicios.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Clock, title: 'Ahorra tiempo', desc: 'Automatiza el agendamiento y reduce el tiempo administrativo en un 80%.' },
              { icon: CheckCircle, title: 'Agenda automática', desc: 'Disponibilidad en tiempo real 24/7 sin intervención humana.' },
              { icon: MapPin, title: 'Multi sucursal', desc: 'Gestiona múltiples sedes y empleados desde un solo panel centralizado.' },
              { icon: Smartphone, title: 'Responsive', desc: 'Experiencia perfecta en móviles, tablets y computadoras.' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="como-funciona" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Reserva en 3 pasos simples</h2>
            <p className="mt-4 text-gray-500">Tus clientes amarán la facilidad de agendar contigo.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-100 -z-10"></div>
            
            {[
              { step: 1, title: 'Selecciona Sucursal', desc: 'Elige la ubicación más cercana en el mapa interactivo.' },
              { step: 2, title: 'Elige Servicio y Hora', desc: 'Selecciona qué necesitas y el mejor horario para ti.' },
              { step: 3, title: 'Confirma tu Cita', desc: 'Recibe confirmación inmediata y recordatorios.' }
            ].map((item) => (
              <div key={item.step} className="text-center bg-white p-4">
                <div className="w-24 h-24 bg-white border-4 border-indigo-50 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-6 shadow-sm">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Demo Block */}
      <section className="py-20 bg-indigo-900 text-white overflow-hidden relative">
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
           <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 space-y-8">
                <h2 className="text-4xl font-bold leading-tight">Vive la experiencia de reserva ahora mismo</h2>
                <p className="text-indigo-200 text-lg">
                  Prueba nuestro widget de reservas en tiempo real. Sin registros complicados, rápido y eficiente. Así es como tus clientes verán tu negocio.
                </p>
                <div className="flex flex-col gap-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center"><CheckCircle size={16}/></div>
                      <span>Validación de disponibilidad en tiempo real</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center"><CheckCircle size={16}/></div>
                      <span>Geolocalización inteligente</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center"><CheckCircle size={16}/></div>
                      <span>Asignación de empleados</span>
                   </div>
                </div>
                <Button onClick={() => onNavigate('BOOKING')} className="bg-white text-indigo-900 hover:bg-gray-100 border-none">
                  Iniciar Demo Interactiva
                </Button>
              </div>

              <div className="lg:w-1/2 w-full">
                  <div className="bg-white rounded-2xl p-6 shadow-2xl text-gray-900">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                          <h3 className="font-bold">Reservar Cita</h3>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> En vivo</span>
                      </div>
                      {/* Simulated Mini Widget */}
                      <div className="space-y-4 opacity-75 pointer-events-none select-none">
                          <div className="h-12 bg-gray-100 rounded-lg w-full flex items-center px-4 text-gray-400">Seleccionar Sucursal...</div>
                          <div className="h-12 bg-gray-100 rounded-lg w-full flex items-center px-4 text-gray-400">Seleccionar Servicio...</div>
                          <div className="grid grid-cols-4 gap-2">
                             {[9,10,11,12].map(h => <div key={h} className="h-10 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-sm text-gray-400">{h}:00</div>)}
                          </div>
                          <div className="h-10 bg-indigo-600 rounded-lg w-full flex items-center justify-center text-white font-bold">Continuar</div>
                      </div>
                      
                      {/* Overlay CTA */}
                      <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-2xl">
                          <Button onClick={() => onNavigate('BOOKING')} className="shadow-xl scale-110">Abrir Widget Completo</Button>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Potencia tu negocio</h2>
            <p className="mt-4 text-gray-500">Herramientas diseñadas para el crecimiento.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
               { title: 'Dashboard Administrativo', desc: 'Control total de métricas, citas y empleados en un solo lugar.', icon: Shield },
               { title: 'Calendario Drag & Drop', desc: 'Gestiona horarios y turnos de manera visual e intuitiva.', icon: Calendar },
               { title: 'Gestión de Clientes', desc: 'Historial completo de visitas y preferencias de cada cliente.', icon: Users },
               { title: 'Servicios Personalizables', desc: 'Configura duraciones, precios y asignación de empleados.', icon: Star },
               { title: 'Geolocalización', desc: 'Tus clientes encuentran la sucursal más cercana automáticamente.', icon: MapPin },
               { title: 'Multi Sucursal', desc: 'Escala tu negocio sin límites de ubicaciones.', icon: MapPin }
             ].map((feat, i) => (
               <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 hover:border-indigo-100 hover:shadow-lg transition-all group">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <feat.icon size={20}/>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{feat.title}</h3>
                  <p className="text-sm text-gray-500">{feat.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Ideal para</h2>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
               {['Salones de Belleza', 'Clínicas Dentales', 'Spas y Wellness', 'Consultorios Médicos', 'Barberías', 'Centros de Terapia'].map((type, i) => (
                  <div key={i} className="px-6 py-3 rounded-full bg-gray-100 text-gray-600 font-medium hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-default">
                    {type}
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-900 to-purple-900 text-white text-center px-4">
         <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">Solicita tu demo personalizada</h2>
            <p className="text-indigo-200 text-lg">¿Listo para transformar la gestión de tu negocio? Hablemos hoy mismo.</p>
            <Button size="lg" className="bg-[#25D366] hover:bg-[#20bd5a] text-white border-none shadow-lg">
               Contactar por WhatsApp
            </Button>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-500" />
              <span className="text-white font-bold text-xl">AgendaPro</span>
           </div>
           <div className="text-sm">
             © 2024 AgendaPro MVP. Todos los derechos reservados.
           </div>
           <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;