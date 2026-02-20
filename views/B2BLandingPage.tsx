import React, { useState } from 'react';
import { Menu, X, CheckCircle, BarChart, Calendar, Users, Smartphone, Shield, ArrowRight, Zap, Globe } from 'lucide-react';
import { Button } from '../components/Button';

interface Props {
  onNavigate: (view: 'ADMIN_LOGIN' | 'LANDING') => void;
}

const B2BLandingPage: React.FC<Props> = ({ onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="font-sans text-slate-900 bg-white">
      {/* --- HEADER --- */}
      <header className="fixed w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo AgendaPro */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">AgendaPro</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Funcionalidades</a>
              <a href="#solutions" className="hover:text-indigo-600 transition-colors">Soluciones</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors">Precios</a>
              <button onClick={() => onNavigate('LANDING')} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Ver Demo Cliente
              </button>
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-4">
              <button onClick={() => onNavigate('ADMIN_LOGIN')} className="text-sm font-medium text-slate-600 hover:text-indigo-600">Iniciar Sesión</button>
              <Button onClick={() => onNavigate('ADMIN_LOGIN')} className="rounded-lg shadow-lg shadow-indigo-100">
                Prueba Gratis
              </Button>
            </div>

            {/* Mobile Toggle */}
            <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 absolute w-full left-0 top-20 p-4 flex flex-col gap-4 shadow-xl animate-fade-in">
             <a href="#features" className="p-2 hover:bg-gray-50 rounded">Funcionalidades</a>
             <a href="#pricing" className="p-2 hover:bg-gray-50 rounded">Precios</a>
             <button onClick={() => onNavigate('LANDING')} className="text-left p-2 text-indigo-600 font-medium">Ver Demo Cliente</button>
             <div className="h-px bg-gray-100 my-2"></div>
             <button onClick={() => onNavigate('ADMIN_LOGIN')} className="text-left p-2 hover:bg-gray-50 rounded">Login</button>
             <Button onClick={() => onNavigate('ADMIN_LOGIN')} fullWidth>Prueba Gratis</Button>
          </div>
        )}
      </header>

      {/* --- HERO --- */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-wider uppercase mb-6 animate-fade-in">
              Software de Gestión #1 en Latam
           </span>
           <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-tight mb-8 max-w-4xl mx-auto animate-fade-in-up">
              Organiza tu negocio y <span className="text-indigo-600">multiplica tus ventas</span>
           </h1>
           <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-100">
              La plataforma todo en uno para salones de belleza, barberías, spas y centros de estética. Agenda, caja, inventario y marketing en un solo lugar.
           </p>
           <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-200">
              <Button size="lg" onClick={() => onNavigate('ADMIN_LOGIN')} className="px-8 py-4 text-lg rounded-xl shadow-xl shadow-indigo-200">
                 Comenzar Prueba Gratis
              </Button>
              <button onClick={() => onNavigate('LANDING')} className="px-8 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 justify-center">
                 <Globe size={20}/> Ver Ejemplo en Vivo
              </button>
           </div>
           
           {/* UI Mockup Placeholder */}
           <div className="mt-20 relative mx-auto max-w-5xl rounded-2xl shadow-2xl border border-slate-200 bg-slate-900 overflow-hidden animate-fade-in-up delay-300">
              <div className="absolute top-0 w-full h-8 bg-slate-800 flex items-center gap-2 px-4">
                 <div className="w-3 h-3 rounded-full bg-red-500"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <img src="https://cdn.dribbble.com/users/1615584/screenshots/15664673/media/4c12579048a6062a4d360f553f14064a.jpg?resize=1600x1200&vertical=center" alt="Dashboard Preview" className="w-full h-auto opacity-90 mt-8"/>
           </div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="py-24 bg-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
               <h2 className="text-3xl font-bold text-slate-900">Todo lo que necesitas para crecer</h2>
               <p className="text-slate-500 mt-4">Deja de usar papel y lápiz. Automatiza tu gestión.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
               {[
                  { icon: Calendar, title: "Agenda Online 24/7", desc: "Tus clientes reservan solos, tú llenas tu agenda incluso mientras duermes." },
                  { icon: Zap, title: "Recordatorios Automáticos", desc: "Reduce el ausentismo hasta en un 80% con alertas por WhatsApp y Email." },
                  { icon: BarChart, title: "Reportes Financieros", desc: "Conoce tus ventas, comisiones y el rendimiento de tu equipo en tiempo real." },
                  { icon: Users, title: "Gestión de Clientes", desc: "Fideliza a tus usuarios con historial de citas y herramientas de marketing." },
                  { icon: Smartphone, title: "App Móvil", desc: "Gestiona tu negocio desde cualquier lugar. Tú y tu equipo siempre conectados." },
                  { icon: Shield, title: "Seguridad Total", desc: "Tus datos en la nube, seguros y accesibles solo para personal autorizado." }
               ].map((feat, i) => (
                  <div key={i} className="p-8 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl transition-all group">
                     <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                        <feat.icon size={28} />
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-3">{feat.title}</h3>
                     <p className="text-slate-500 leading-relaxed">{feat.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* --- STATS / SOCIAL PROOF --- */}
      <section className="py-24 bg-slate-900 text-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-12">Confían en nosotros</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               <div className="p-6">
                  <div className="text-4xl font-bold text-indigo-400 mb-2">40k+</div>
                  <div className="text-slate-400">Negocios</div>
               </div>
               <div className="p-6">
                  <div className="text-4xl font-bold text-indigo-400 mb-2">10M+</div>
                  <div className="text-slate-400">Citas Mensuales</div>
               </div>
               <div className="p-6">
                  <div className="text-4xl font-bold text-indigo-400 mb-2">3</div>
                  <div className="text-slate-400">Países</div>
               </div>
               <div className="p-6">
                  <div className="text-4xl font-bold text-indigo-400 mb-2">99%</div>
                  <div className="text-slate-400">Satisfacción</div>
               </div>
            </div>
         </div>
      </section>

      {/* --- CTA BOTTOM --- */}
      <section className="py-24 bg-indigo-600">
         <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-4xl font-bold mb-6">¿Listo para digitalizar tu negocio?</h2>
            <p className="text-indigo-100 text-xl mb-10">Únete a miles de profesionales que ya usan AgendaPro para gestionar su éxito.</p>
            <Button size="lg" onClick={() => onNavigate('ADMIN_LOGIN')} className="bg-white text-indigo-600 hover:bg-slate-100 border-none px-10 py-4 text-lg shadow-xl">
               Empezar Ahora Gratis
            </Button>
            <p className="mt-4 text-sm text-indigo-200 opacity-80">No requiere tarjeta de crédito • Cancela cuando quieras</p>
         </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-100 py-12">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                  <Calendar size={18} />
               </div>
               <span className="text-xl font-bold text-slate-900">AgendaPro</span>
            </div>
            <div className="text-slate-500 text-sm">
               © 2024 AgendaPro Inc. Todos los derechos reservados.
            </div>
            <div className="flex gap-6 text-sm font-medium text-slate-600">
               <a href="#" className="hover:text-indigo-600">Privacidad</a>
               <a href="#" className="hover:text-indigo-600">Términos</a>
               <a href="#" className="hover:text-indigo-600">Soporte</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default B2BLandingPage;