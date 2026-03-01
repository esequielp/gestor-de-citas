import React, { useState, useEffect } from 'react';
import { Calendar, MessageCircle, LogOut, User, Clock, Star, X, Edit2, Check, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { dataService } from '../services/dataService';
import { Appointment, Client } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface Props {
    onLogout: () => void;
    onBack: () => void;
}

const ClientProfile: React.FC<Props> = ({ onLogout, onBack }) => {
    const [clientData, setClientData] = useState<Client | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
    const [testimonialText, setTestimonialText] = useState('');
    const [testimonialRating, setTestimonialRating] = useState(5);
    const [isSubmittingTestimonial, setIsSubmittingTestimonial] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [editPhoneValue, setEditPhoneValue] = useState('');
    const [isSavingPhone, setIsSavingPhone] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.email) {
                    onLogout();
                    return;
                }

                const client = await dataService.getOrCreateClient(
                    session.user.user_metadata?.full_name || session.user.email,
                    session.user.email,
                    '',
                    session.user.id
                );

                if (client) {
                    setClientData(client);
                    setEditPhoneValue(client.phone || '');
                    const apps = await dataService.getAppointmentsByClient(client.id);
                    setAppointments(apps);
                }
            } catch (err) {
                console.error("Error fetching client profile", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const formatDateDisplay = (dateStr: string): string => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const formatTime12h = (mins: number | null): string => {
        if (mins === null) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const handleTestimonialSubmit = async () => {
        if (!testimonialText.trim() || !clientData) return;
        setIsSubmittingTestimonial(true);
        try {
            await dataService.addTestimonial({
                client_name: clientData.name,
                // If you had the google image in session: client_image: session.user.user_metadata?.avatar_url
                text: testimonialText,
                rating: testimonialRating
            });
            alert('¡Gracias por tu opinión! Ha sido enviada y será publicada próximamente.');
            setIsTestimonialModalOpen(false);
            setTestimonialText('');
            setTestimonialRating(5);
        } catch (e) {
            console.error("Error al enviar el testimonio", e);
            alert('Hubo un error al enviar tu testimonio. Inténtalo de nuevo.');
        } finally {
            setIsSubmittingTestimonial(false);
        }
    };

    const handleSavePhone = async () => {
        if (!clientData) return;
        try {
            setIsSavingPhone(true);
            const updated = await dataService.updateClient({ ...clientData, phone: editPhoneValue });
            setClientData(updated);
            setIsEditingPhone(false);
        } catch (e) {
            console.error("Error updating phone", e);
            alert('Oh no! Hubo un error al guardar tu WhatsApp.');
        } finally {
            setIsSavingPhone(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-black text-gray-900">Mi Perfil</h1>
                    <button onClick={onLogout} className="text-gray-500 hover:text-red-500 transition-colors p-2">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">

                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md">
                        {clientData?.name?.charAt(0).toUpperCase() || <User size={40} />}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">{clientData?.name}</h2>
                        <p className="text-gray-500">{clientData?.email}</p>

                        <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                            {isEditingPhone ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="tel"
                                        value={editPhoneValue}
                                        onChange={e => setEditPhoneValue(e.target.value)}
                                        placeholder="Tu WhatsApp..."
                                        className="border border-gray-300 rounded-md px-3 py-1 text-sm outline-none focus:border-indigo-500"
                                        autoFocus
                                    />
                                    <button onClick={handleSavePhone} disabled={isSavingPhone} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                                        {isSavingPhone ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    </button>
                                    <button onClick={() => { setIsEditingPhone(false); setEditPhoneValue(clientData?.phone || ''); }} className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className={`font-medium ${clientData?.phone ? 'text-gray-700' : 'text-amber-600'}`}>
                                        {clientData?.phone || 'Sin número registrado (Requerido para WhatsApp)'}
                                    </p>
                                    <button onClick={() => setIsEditingPhone(true)} className="text-indigo-600 hover:text-indigo-800 transition-colors p-1" title="Editar teléfono">
                                        <Edit2 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <Button onClick={onBack} variant="secondary" className="shrink-0">
                        Nueva Reserva
                    </Button>
                </div>

                {/* Histórico de Citas */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="text-indigo-600" />
                        Historial de Citas
                    </h3>

                    {appointments.length === 0 ? (
                        <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-500">Aún no tienes citas reservadas.</p>
                            <Button className="mt-4" onClick={onBack}>Agendar Ahora</Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {appointments.map(app => (
                                <div key={app.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase">
                                            {app.status}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg mb-2">Cita Programada</h4>
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            {formatDateDisplay(app.date)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-gray-400" />
                                            {formatTime12h(app.time)}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                                        {app.status === 'confirmed' && (
                                            <Button variant="secondary" size="sm" className="flex-1 opacity-70 hover:opacity-100">
                                                Reprogramar
                                            </Button>
                                        )}
                                        <Button size="sm" className="flex-1 flex gap-2 items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                                            <MessageCircle size={16} /> Contactar Profesional
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dejar Testimonio Box */}
                <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex flex-col md:flex-row items-center justify-between mt-8 gap-4 shadow-sm">
                    <div>
                        <h3 className="text-xl font-bold text-indigo-900 mb-1">Cuentanos tu experiencia</h3>
                        <p className="text-indigo-700 text-sm">Tu opinión es muy importante para nosotros y ayuda a otros clientes.</p>
                    </div>
                    <Button onClick={() => setIsTestimonialModalOpen(true)} className="shrink-0">
                        <Star size={16} fill="currentColor" className="mr-2" /> Dejar Testimonio
                    </Button>
                </div>
            </main>

            {/* Testimonial Modal */}
            {isTestimonialModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-5 border border-gray-100 shadow-2xl relative">
                        <button onClick={() => setIsTestimonialModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>

                        <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                                <Star className="text-yellow-400" fill="currentColor" size={24} />
                                Califica el servicio
                            </h3>
                            <p className="text-sm text-gray-500">¿Cómo evaluarías tu experiencia general?</p>
                        </div>

                        <div className="flex justify-center gap-2 py-4">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} onClick={() => setTestimonialRating(star)} className="focus:outline-none transform transition-transform hover:scale-110">
                                    <Star
                                        size={36}
                                        className={star <= testimonialRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                                    />
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cuéntanos más detalle</label>
                            <textarea
                                value={testimonialText}
                                onChange={(e) => setTestimonialText(e.target.value)}
                                placeholder="Ej: Me encantó el servicio, muy profesionales y puntuales..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                            ></textarea>
                        </div>

                        <div className="pt-2">
                            <Button
                                className="w-full justify-center text-base py-3"
                                onClick={handleTestimonialSubmit}
                                disabled={isSubmittingTestimonial || !testimonialText.trim()}
                            >
                                {isSubmittingTestimonial ? 'Enviando...' : 'Enviar Testimonio'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientProfile;
