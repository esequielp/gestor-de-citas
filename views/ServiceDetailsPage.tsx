import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CalendarCheck, CheckCircle2, Star, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '../components/Button';
import { ViewState, Service } from '../types';
import { dataService } from '../services/dataService';

interface Props {
    serviceId: string;
    onNavigate: (view: ViewState) => void;
    onBack: () => void;
}

const ServiceDetailsPage: React.FC<Props> = ({ serviceId, onNavigate, onBack }) => {
    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState<any>(null);

    useEffect(() => {
        const fetchContext = async () => {
            try {
                setLoading(true);
                const [services, companyInfo] = await Promise.all([
                    dataService.getServices(),
                    dataService.getCompanyInfo()
                ]);
                const found = (services as Service[]).find(s => s.id === serviceId);
                if (found) {
                    setService(found);
                }
                setCompany(companyInfo);
            } catch (e) {
                console.error("Error loading service details:", e);
            } finally {
                setLoading(false);
            }
        };
        if (serviceId) {
            fetchContext();
        }
    }, [serviceId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Servicio no encontrado</h2>
                <Button onClick={onBack}>Volver atrás</Button>
            </div>
        );
    }

    // Handle multiple images from stringified array if applicable
    let heroImage = "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1920";
    try {
        if (service.image && service.image.startsWith('[')) {
            const imgs = JSON.parse(service.image);
            if (imgs.length > 0) heroImage = imgs[0];
        } else if (service.image) {
            heroImage = service.image;
        }
    } catch (e) { }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24">
            {/* Header Sticky nav */}
            <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                        <ArrowLeft size={20} /> <span className="hidden sm:inline">Volver</span>
                    </button>
                    <div className="font-bold text-lg">{company?.nombre || 'Beauty & Spa'}</div>
                    <Button onClick={() => onNavigate('BOOKING')} className="rounded-full shadow-md text-sm px-4">
                        Reservar Ahora
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative pt-16">
                <div className="w-full h-[40vh] md:h-[55vh] relative bg-indigo-900 overflow-hidden">
                    <img src={heroImage} alt={service.name} className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>

                    <div className="absolute bottom-0 w-full p-6 md:pb-12 text-center md:text-left">
                        <div className="max-w-5xl mx-auto">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full text-xs font-semibold tracking-wider uppercase mb-4 animate-fade-in-up">
                                <Star size={14} className="fill-yellow-400 text-yellow-400" /> Excelencia Garantizada
                            </div>
                            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg animate-fade-in-up delay-100 leading-tight">
                                {service.name || (service as any).nombre}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-200 font-medium text-lg animate-fade-in-up delay-200">
                                <span className="flex items-center gap-1"><Clock size={18} className="text-indigo-300" /> {service.duration} mins</span>
                                <span className="text-white/40">•</span>
                                <span className="flex items-center gap-1 font-bold text-white bg-indigo-600/80 px-3 py-1 rounded-full shadow border border-indigo-400/50">
                                    ${service.price ?? (service as any).precio}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid md:grid-cols-3 gap-8 relative">

                {/* Main Content (Copywriter area) */}
                <div className="md:col-span-2 space-y-8 bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100">
                    <div className="prose prose-lg prose-indigo max-w-none text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: service.description || '<p>Transforma tu día con nuestra experiencia premium. Reserva ahora y descubre la diferencia.</p>' }}
                    />

                    <hr className="border-gray-100 my-8" />

                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 md:p-8 border border-indigo-100 relative overflow-hidden">
                        <Zap className="absolute -right-6 -top-6 w-32 h-32 text-indigo-500/10" />
                        <h3 className="font-bold text-2xl text-indigo-900 mb-6 flex items-center gap-2">¿Por qué elegirnos? <ShieldCheck className="text-indigo-500" /></h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20} />
                                <p className="text-gray-700"><strong>Atención 100% personalizada:</strong> Nos enfocamos en tus necesidades exactas para garantizar los resultados que buscas.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20} />
                                <p className="text-gray-700"><strong>Profesionales Top Tier:</strong> Especialistas con años de experiencia real en el mercado, calificados y verificados.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20} />
                                <p className="text-gray-700"><strong>Ambiente Premium:</strong> Todo está diseñado para que te desconectes del estrés y vivas una experiencia transformadora.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Sidebar CTA */}
                <div className="md:col-span-1 relative">
                    <div className="sticky top-24 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 text-center animate-fade-in">
                        <div className="text-gray-500 font-medium mb-1 uppercase tracking-widest text-xs">Asegura tu lugar hoy</div>
                        <div className="text-4xl font-extrabold text-gray-900 mb-6">
                            ${service.price ?? (service as any).precio}
                        </div>

                        <div className="space-y-3 mb-8 text-left text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Clock size={16} /> Duración</span> <span className="font-semibold text-gray-900">{service.duration} mins</span></div>
                            {service.sesiones_totales && service.sesiones_totales > 1 && (
                                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><CalendarCheck size={16} /> Sesiones</span> <span className="font-semibold text-gray-900">{service.sesiones_totales} plan</span></div>
                            )}
                        </div>

                        <Button onClick={() => onNavigate('BOOKING')} size="lg" fullWidth className="py-4 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:scale-105 transition-transform bg-gradient-to-r from-indigo-600 to-indigo-700">
                            AGENDAR AHORA
                        </Button>
                        <p className="text-xs text-gray-400 mt-4 font-medium flex items-center justify-center gap-1">
                            <ShieldCheck size={14} className="text-green-500" /> Reserva 100% segura. Confirmación inmediata.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ServiceDetailsPage;
