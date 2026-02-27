import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Users, MapPin, LogOut, Clock, X, Link as LinkIcon, Plus, Trash2, CheckCircle, Sparkles, Scissors, Edit2, DollarSign, Activity, ChevronLeft, ChevronRight, List, User, Phone, Mail, History, LayoutDashboard, TrendingUp, AlertCircle, CalendarClock, Settings, Bell, Zap, MessageCircle, MessageSquare, Send, Bot, Loader2, Globe, Search } from 'lucide-react';
import { dataService } from '../services/dataService';
import apiClient from '../services/apiClient';
import { Appointment, Branch, Employee, DaySchedule, TimeRange, Service, Client } from '../types';
import { Button } from '../components/Button';
import { HOURS_OF_OPERATION, SCHEDULE_HALF_HOURS, formatScheduleHour } from '../constants';
// @ts-ignore
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
// @ts-ignore
import L from 'leaflet';

// Helper to format time - handles both hour-integer (9) and minutesFromMidnight (540) formats
const formatTimeValue = (time: number): string => {
    if (time >= 24) {
        // minutesFromMidnight format (e.g., 540 = 9:00 AM)
        const h = Math.floor(time / 60);
        const m = time % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    // legacy hour-integer format (e.g., 9 = 09:00)
    return `${Math.floor(time).toString().padStart(2, '0')}:${time % 1 === 0.5 ? '30' : '00'}`;
};

// Convert time value to the hour integer used by the calendar grid
const timeToHour = (time: number): number => {
    if (time >= 24) return Math.floor(time / 60); // minutesFromMidnight
    return Math.floor(time); // already an hour
};

// Convert YYYY-MM-DD to dd/mm/YYYY for display
const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Convert time value to minutesFromMidnight for calculations
const timeToMinutes = (time: number): number => {
    if (time >= 24) return time; // already minutesFromMidnight
    return Math.floor(time) * 60 + (time % 1 === 0.5 ? 30 : 0);
};

interface Props {
    onLogout: () => void;
}

type Tab = 'DASHBOARD' | 'APPOINTMENTS' | 'CLIENTS' | 'EMPLOYEES' | 'BRANCHES' | 'SERVICES' | 'SETTINGS' | 'MESSAGES';
type ViewMode = 'LIST' | 'CALENDAR';
type SettingsSubTab = 'PROFILE' | 'CHATBOT' | 'WHATSAPP' | 'REMINDERS';

const DAYS_OF_WEEK = [
    { id: 1, label: 'Lun', full: 'Lunes' },
    { id: 2, label: 'Mar', full: 'Martes' },
    { id: 3, label: 'Mié', full: 'Miércoles' },
    { id: 4, label: 'Jue', full: 'Jueves' },
    { id: 5, label: 'Vie', full: 'Viernes' },
    { id: 6, label: 'Sáb', full: 'Sábado' },
    { id: 0, label: 'Dom', full: 'Domingo' },
];

// Fix for default Leaflet icons
const iconBranch = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to handle map clicks, dragging and update coordinates
const LocationPicker = ({ onLocationSelect, position }: { onLocationSelect: (lat: number, lng: number) => void, position: { lat: number, lng: number } | null }) => {
    const markerRef = React.useRef<any>(null);

    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    const eventHandlers = React.useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    onLocationSelect(lat, lng);
                }
            },
        }),
        [onLocationSelect],
    );

    return position ? (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[position.lat, position.lng]}
            icon={iconBranch}
            ref={markerRef}
        />
    ) : null;
};

// Componente para manejar lista de tiempos
const ReminderInputList = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
    const [inputValue, setInputValue] = useState('');
    const items = value ? value.split(',').filter(x => x) : [];

    const handleAdd = () => {
        if (!inputValue || isNaN(Number(inputValue))) return;
        if (items.length >= 3) {
            return; // Máximo 3 recordatorios permitidos
        }
        const newItems = [...items, inputValue].sort((a, b) => Number(b) - Number(a)); // Ordenar descendente
        onChange(newItems.join(','));
        setInputValue('');
    };

    const handleRemove = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems.join(','));
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                    <input
                        type="number"
                        step="0.25"
                        placeholder="Ej. 24 (horas antes)"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Clock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
                <Button onClick={handleAdd} type="button" size="sm" disabled={items.length >= 3}>
                    <Plus size={18} />
                </Button>
            </div>
            <div className="flex flex-wrap gap-2">
                {items.map((item, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        {item}h antes
                        <button onClick={() => handleRemove(idx)} className="hover:text-red-500"><X size={14} /></button>
                    </span>
                ))}
                {items.length === 0 && <span className="text-xs text-gray-400 italic">Sin recordatorios configurados</span>}
            </div>
            <p className="text-xs text-gray-500 mt-1">Agrega hasta 3 momentos (ej: 24h, 1h, 0.5h para 30min).</p>
        </div>
    );
};

const AdminDashboard: React.FC<Props> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    // --- Chat/Messages States ---
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [chatFilter, setChatFilter] = useState<'ALL' | 'WHATSAPP' | 'WEB_CHAT' | 'WEB_CONTACT'>('ALL');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Filters & View State
    const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
    const [refreshKey, setRefreshKey] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('CALENDAR');
    const [calendarDate, setCalendarDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('PROFILE');

    // Settings State
    const [businessProfile, setBusinessProfile] = useState({
        name: '',
        slogan: '',
        description: '',
        logoUrl: '',
        email: '',
        address: '',
        website: '',
        whatsappDisplay: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        twitter: '',
        youtube: ''
    });

    const [chatbotConfig, setChatbotConfig] = useState({
        enabled: true,
        businessName: '',
        businessType: 'Salón de belleza y cosmetología',
        greeting: '',
        personality: '',
        customInstructions: ''
    });

    const [whatsappConfig, setWhatsappConfig] = useState({
        phoneNumberId: '',
        accessToken: '',
        verifyToken: '',
        businessAccountId: '',
        templateName: '',
        isConfigured: false
    });

    const [reminderSettings, setReminderSettings] = useState({
        emailReminderHours: "24",
        whatsappReminderHours: "2"
    });

    const [loadingSettings, setLoadingSettings] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingChatbot, setLoadingChatbot] = useState(false);
    const [loadingWaConfig, setLoadingWaConfig] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [chatbotSaved, setChatbotSaved] = useState(false);

    // Messages State
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

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
    const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
    const [loadingClientHistory, setLoadingClientHistory] = useState(false);

    // --- Appointment Modal State ---
    const [editingAppointment, setEditingAppointment] = useState<Partial<Appointment> | null>(null);

    // --- Toast Notification ---
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; visible: boolean }>({ message: '', type: 'info', visible: false });
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
    };

    // --- Confirm Dialog ---
    const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; visible: boolean }>({ message: '', onConfirm: () => { }, visible: false });
    const showConfirm = (message: string, onConfirm: () => void) => {
        setConfirmDialog({ message, onConfirm, visible: true });
    };
    const handleConfirmAccept = () => {
        confirmDialog.onConfirm();
        setConfirmDialog(prev => ({ ...prev, visible: false }));
    };
    const handleConfirmCancel = () => {
        setConfirmDialog(prev => ({ ...prev, visible: false }));
    };

    useEffect(() => {
        const loadData = async () => {
            const allBranches = await dataService.getBranches();
            const allServices = await dataService.getServices();
            const allAppointments = await dataService.getAppointments();
            const allClients = await dataService.getClients();

            setBranches(allBranches);
            setServices(allServices);
            setAppointments(allAppointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setClients(allClients);

            // Flatten employees for list view
            const allEmpsPromises = allBranches.map(b => dataService.getEmployeesByBranch(b.id));
            const allEmpsArrays = await Promise.all(allEmpsPromises);
            const allEmps = allEmpsArrays.flat();

            const uniqueEmps = Array.from(new Map(allEmps.map(item => [item.id, item])).values());
            setEmployees(uniqueEmps);

            // Default branch selection for calendar
            if (!selectedBranchId && allBranches.length > 0) {
                setSelectedBranchId(allBranches[0].id);
            }
        };
        loadData();
    }, [refreshKey, selectedBranchId]);

    // Fetch Settings when tab is active
    useEffect(() => {
        if (activeTab === 'SETTINGS') {
            const loadSettings = async () => {
                try {
                    setLoadingSettings(true);
                    const [profile, chatbot, whatsapp, reminders] = await Promise.all([
                        dataService.getBusinessProfile(),
                        dataService.getChatbotConfig(),
                        apiClient.get('/settings/whatsapp'),
                        apiClient.get('/settings/reminders')
                    ]);
                    if (profile) setBusinessProfile(profile);
                    if (chatbot) setChatbotConfig(chatbot);
                    if (whatsapp.data) setWhatsappConfig(whatsapp.data);
                    if (reminders.data) setReminderSettings(reminders.data);
                } catch (error) {
                    console.error("Error loading settings:", error);
                } finally {
                    setLoadingSettings(false);
                }
            };
            loadSettings();
        }
    }, [activeTab]);

    // Messages Logic
    useEffect(() => {
        if (activeTab === 'MESSAGES') {
            loadChats();
        }
    }, [activeTab]);

    const loadChats = async () => {
        try {
            const data = await dataService.getChats();
            setChats(data || []);

            // Calculate total unread count
            const totalUnread = (data || []).reduce((sum: number, chat: any) => sum + (chat.unreadCount || 0), 0);
            setUnreadMsgCount(totalUnread);
        } catch (e) {
            console.error('Error loading chats', e);
        }
    };

    // Polling for new messages and chat list
    useEffect(() => {
        const interval = setInterval(() => {
            loadChats();
        }, 10000); // Every 10 seconds for the general list
        return () => clearInterval(interval);
    }, []);

    // Focused polling for the selected chat's messages
    useEffect(() => {
        if (!selectedChat) return;

        const interval = setInterval(() => {
            loadMessages(selectedChat.id);
        }, 5000); // Every 5 seconds for the open chat

        return () => clearInterval(interval);
    }, [selectedChat]);

    const loadMessages = async (clientId: string) => {
        if (!clientId) return;
        setIsLoadingMessages(true);
        try {
            const msgs = await dataService.getMessages(clientId);
            setChatMessages(msgs || []);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (e) {
            console.error('Error loading messages', e);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleSelectChat = async (chat: any) => {
        setSelectedChat(chat);
        loadMessages(chat.id);
        try {
            await dataService.markAsRead(chat.id);
            loadChats(); // Reload to update unread counts
        } catch (e) {
            console.error('Error marking as read', e);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        setIsSendingMessage(true);
        try {
            const via = selectedChat.via || 'WEB_CHAT';

            if (via === 'WEB_CONTACT') {
                // For contact form messages, reply via email
                const email = selectedChat.email || selectedChat.telefono || '';
                const clientName = selectedChat.nombre || 'Cliente';

                // Get the original message (first message in the chat)
                const originalMsg = chatMessages.length > 0 ? (chatMessages[0].contenido || chatMessages[0].texto || '') : '';

                await dataService.replyContact({
                    email,
                    clientName,
                    originalMessage: originalMsg,
                    replyMessage: newMessage
                });
                showToast(`Respuesta enviada por email a ${email}`, 'success');
            } else {
                // For WhatsApp and Web Chat, use the existing send flow
                const tenantId = localStorage.getItem('tenantId') || 'demo';
                const clientId = selectedChat.client_id || selectedChat.id;
                const phone = selectedChat.telefono || '';

                await dataService.sendWhatsAppMessage(
                    clientId,
                    phone,
                    newMessage,
                    tenantId,
                    via
                );
            }

            setNewMessage('');
            await loadMessages(selectedChat.id);
        } catch (e) {
            showToast('Error al enviar el mensaje', 'error');
        } finally {
            setIsSendingMessage(false);
        }
    };

    const renderMessages = () => {
        const getViaLabel = (via: string) => {
            switch (via) {
                case 'WHATSAPP': return { label: 'WhatsApp', color: 'bg-green-100 text-green-700', icon: <Bot size={12} /> };
                case 'WEB_CHAT': return { label: 'Web Chat', color: 'bg-blue-100 text-blue-700', icon: <Globe size={12} /> };
                case 'WEB_CONTACT': return { label: 'Contacto', color: 'bg-amber-100 text-amber-700', icon: <Mail size={12} /> };
                default: return { label: 'Mensaje', color: 'bg-gray-100 text-gray-700', icon: <MessageSquare size={12} /> };
            }
        };

        const filteredChats = chats.filter(chat => {
            if (chatFilter === 'ALL') return true;
            return chat.via === chatFilter;
        });

        return (
            <div className="h-[calc(100vh-130px)] flex animate-fade-in bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden text-gray-800">
                {/* Sidebar (Chat List) */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col bg-slate-50 max-w-sm">
                    <div className="p-5 border-b border-gray-200 bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <MessageSquare size={24} className="text-indigo-600" /> Mensajes
                            </h3>
                            <button
                                onClick={loadChats}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                                <Activity size={18} />
                            </button>
                        </div>

                        {/* Filter Tabs - Premium WhatsApp Style */}
                        <div className="flex gap-1 mb-3 bg-gray-50 p-1 rounded-xl border border-gray-100">
                            {[
                                { id: 'ALL', label: 'Todos' },
                                { id: 'WHATSAPP', label: 'WhatsApp' },
                                { id: 'WEB_CHAT', label: 'Web' },
                                { id: 'WEB_CONTACT', label: 'Contacto' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setChatFilter(tab.id as any)}
                                    className={`flex-1 py-1.5 min-w-0 rounded-lg text-[10px] font-bold transition-all truncate px-1 ${chatFilter === tab.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar en chats..."
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:border-indigo-300 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredChats.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-sm">No hay mensajes {chatFilter !== 'ALL' ? 'en esta categoría' : 'aún'}.</p>
                            </div>
                        ) : (
                            filteredChats.map(chat => {
                                const isSelected = selectedChat?.id === chat.id;
                                const viaInfo = getViaLabel(chat.via);

                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat)}
                                        className={`w-full text-left p-4 border-b border-gray-100 transition-all ${isSelected ? 'bg-white shadow-md z-10 border-l-4 border-l-indigo-600' : 'hover:bg-gray-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold truncate pr-2">{chat.nombre}</span>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {chat.ult_msg_fecha ? new Date(chat.ult_msg_fecha).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${viaInfo.color}`}>
                                                {viaInfo.icon} {viaInfo.label}
                                            </span>
                                            {chat.unreadCount > 0 && (
                                                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 rounded-full ml-auto">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate italic">
                                            {chat.ult_msg_texto || 'Cargando...'}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-[#F8F9FB] relative">
                    {selectedChat ? (
                        <>
                            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold mr-3">
                                        {(selectedChat.nombre || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{selectedChat.nombre}</h4>
                                        <div className="flex gap-3 text-[10px] text-gray-400">
                                            {selectedChat.telefono && <span className="flex items-center gap-1"><Phone size={10} /> {selectedChat.telefono}</span>}
                                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${getViaLabel(selectedChat.via).color}`}>
                                                {getViaLabel(selectedChat.via).label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {selectedChat.via === 'WEB_CONTACT' ? (
                                        /* Contact chats: show email reply indicator */
                                        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                                            <Mail size={14} className="text-amber-600" />
                                            <span className="text-xs font-bold text-amber-700">Responder por email</span>
                                        </div>
                                    ) : (
                                        /* WhatsApp / Web Chat: show AI Toggle */
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                            <Bot size={16} className={selectedChat.ai_disabled ? "text-gray-400" : "text-indigo-600"} />
                                            <span className="text-xs font-bold text-gray-600">IA Activa</span>
                                            <button
                                                onClick={async () => {
                                                    const newStatus = !selectedChat.ai_disabled;
                                                    try {
                                                        await apiClient.post(`/whatsapp/ai-toggle/${selectedChat.id}`, { disabled: newStatus });
                                                        setSelectedChat({ ...selectedChat, ai_disabled: newStatus });
                                                        showToast(newStatus ? 'IA pausada para este chat' : 'IA reactivada', 'info');
                                                    } catch (e) {
                                                        showToast('Error al cambiar modo de IA', 'error');
                                                    }
                                                }}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${selectedChat.ai_disabled ? 'bg-gray-300' : 'bg-indigo-600'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${selectedChat.ai_disabled ? 'left-0.5' : 'left-5.5'}`} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{
                                backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`
                            }}>
                                {isLoadingMessages && chatMessages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : chatMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <MessageSquare size={48} className="mb-2 opacity-20" />
                                        <p className="text-sm">No hay mensajes en esta conversación</p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, idx) => {
                                        const isBot = msg.tipo === 'SALIENTE';
                                        return (
                                            <div key={idx} className={`flex ${isBot ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${isBot
                                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                    }`}>
                                                    {msg.contenido || msg.texto || 'Mensaje sin contenido'}
                                                    <div className={`text-[10px] mt-1 flex justify-end items-center gap-1 ${isBot ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isBot && <CheckCircle size={10} />}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} className="h-4" />
                            </div>

                            <div className="px-6 py-4 bg-white border-t border-gray-200">
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Escribe un mensaje..."
                                        className="flex-1 bg-transparent border-none outline-none px-3 py-1 text-sm"
                                        disabled={isSendingMessage}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || isSendingMessage}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${!newMessage.trim() || isSendingMessage
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                                            }`}
                                    >
                                        {isSendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <MessageSquare size={40} className="text-indigo-200" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Bandeja de Entrada</h3>
                            <p className="text-gray-400 max-w-sm text-sm">Selecciona un chat para ver los mensajes de WhatsApp, Web Chat o Contacto.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- Client Logic ---

    const handleSaveClient = async () => {
        if (!editingClient || !editingClient.name || !editingClient.phone) {
            showToast('Nombre y Teléfono son obligatorios', 'warning');
            return;
        }

        if (editingClient.id) {
            await dataService.updateClient(editingClient as Client);
        } else {
            await dataService.addClient({
                name: editingClient.name,
                email: editingClient.email || '',
                phone: editingClient.phone
            });
        }
        setEditingClient(null);
        setRefreshKey(prev => prev + 1);
    };

    const handleDeleteClient = async (id: string) => {
        showConfirm('¿Eliminar cliente?', async () => {
            const success = await dataService.deleteClient(id);
            if (!success) {
                showToast('No se puede eliminar un cliente con citas activas.', 'error');
            } else {
                setRefreshKey(prev => prev + 1);
                showToast('Cliente eliminado', 'success');
            }
        });
    };

    const handleViewHistory = async (client: Client) => {
        setViewingClientHistory(client);
        setHistoryLimit(5); // Reset limit
        setLoadingClientHistory(true);
        try {
            const history = await dataService.getAppointmentsByClient(client.id);
            setClientHistory(history);
        } catch (error) {
            console.error("Error fetching client history", error);
            setClientHistory([]);
        } finally {
            setLoadingClientHistory(false);
        }
    };

    // --- Appointment Logic ---

    const handleDeleteAppointment = async (id: string) => {
        showConfirm('¿Seguro que deseas cancelar esta cita?', async () => {
            await dataService.deleteAppointment(id);
            setEditingAppointment(null);
            setRefreshKey(prev => prev + 1);
            showToast('Cita cancelada', 'success');
        });
    };

    const handleSaveAppointment = async () => {
        if (!editingAppointment || !editingAppointment.clientId || !editingAppointment.date || !editingAppointment.employeeId || !editingAppointment.serviceId) {
            showToast('Por favor completa todos los campos requeridos (Cliente, Servicio, Profesional, Fecha, Hora).', 'warning');
            return;
        }

        // For MVP, simple check. If editing, we might clash with ourselves if we don't exclude self.
        // Let's assume backend handles conflict for create, and for update we trust the user or backend throws error.

        const client = await dataService.getClientById(editingAppointment.clientId);

        try {
            if (editingAppointment.id) {
                await dataService.updateAppointment({
                    ...editingAppointment,
                    clientName: client?.name || 'Cliente' // Update display name
                } as Appointment);
            } else {
                await dataService.addAppointment({
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
        } catch (e) {
            showToast('Error al guardar cita: ' + e, 'error');
        }
    };

    const handleSlotClick = (empId: string, time: number) => {
        setEditingAppointment({
            branchId: selectedBranchId,
            employeeId: empId,
            date: calendarDate,
            time: time * 60,
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

    const handleSaveSchedule = async () => {
        if (!editingEmployee) return;
        const updatedEmployee: Employee = { ...editingEmployee, weeklySchedule: tempSchedule };
        await dataService.updateEmployee(updatedEmployee);
        setEditingEmployee(null);
        setRefreshKey(prev => prev + 1);
    };

    // --- Renderers ---

    const renderSidebar = () => (
        <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col hidden md:flex sticky top-0 h-screen">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold tracking-tight">GestorCitas Admin</h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {[
                    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Resumen' },
                    { id: 'APPOINTMENTS', icon: CalendarIcon, label: 'Citas' },
                    { id: 'CLIENTS', icon: Users, label: 'Clientes' },
                    { id: 'SERVICES', icon: Scissors, label: 'Servicios' },
                    { id: 'EMPLOYEES', icon: User, label: 'Empleados' },
                    { id: 'BRANCHES', icon: MapPin, label: 'Sucursales' },
                    { id: 'MESSAGES', icon: MessageSquare, label: 'Mensajes', badge: unreadMsgCount },
                    { id: 'SETTINGS', icon: Settings, label: 'Configuración' }
                ].map((item: any) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as Tab)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        <item.icon size={18} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span>
                        )}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-4">
                <button onClick={() => {
                    const baseUrl = window.location.origin + window.location.pathname;
                    const directLink = `${baseUrl}?view=booking`;
                    navigator.clipboard.writeText(directLink).then(() => showToast('Enlace copiado al portapapeles', 'success')).catch(() => showToast('Enlace: ' + directLink, 'info'));
                }} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors border border-slate-700">
                    <LinkIcon size={14} /> Copiar Enlace Citas
                </button>
                <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
                    <LogOut size={16} /> Cerrar Sesión
                </button>
            </div>
        </div>
    );

    const renderOverview = () => {
        // Metrics Calculation
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAppointments = appointments.filter(a => a.date === todayStr && a.status === 'confirmed').length;

        // Weekly (Simple: appointments in the next 7 days including today)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const weeklyAppointments = appointments.filter(a => {
            const d = new Date(a.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d >= today && d <= nextWeek && a.status === 'confirmed';
        }).length;

        const pendingAppointments = appointments.filter(a => {
            const d = new Date(a.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d >= today && a.status === 'confirmed';
        }).length;

        const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;

        // Upcoming List (Top 5)
        const upcomingList = appointments
            .filter(a => {
                const d = new Date(a.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return d >= today && a.status === 'confirmed';
            })
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.time - b.time;
            })
            .slice(0, 5);

        const stats = [
            { label: 'Citas Hoy', value: todayAppointments, icon: CalendarIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Esta Semana', value: weeklyAppointments, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Pendientes', value: pendingAppointments, icon: CalendarClock, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Canceladas', value: cancelledAppointments, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Clientes', value: clients.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Empleados', value: employees.length, icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
        ];

        return (
            <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-gray-800">Resumen del Negocio</h2>
                    <p className="text-gray-500">Vista general del estado de tus sucursales y citas.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-2 hover:shadow-md transition-shadow">
                            <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <span className="text-2xl font-bold text-gray-900 block">{stat.value}</span>
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Upcoming Appointments */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Próximas Citas</h3>
                            <button onClick={() => setActiveTab('APPOINTMENTS')} className="text-sm text-indigo-600 hover:underline">Ver calendario completo</button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {upcomingList.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No hay citas próximas agendadas.</div>
                            ) : (
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 text-gray-800 uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="px-6 py-3">Cliente</th>
                                            <th className="px-6 py-3">Detalles</th>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {upcomingList.map(appt => {
                                            const srv = services.find(s => s.id === appt.serviceId);
                                            const emp = employees.find(e => e.id === appt.employeeId);
                                            const br = branches.find(b => b.id === appt.branchId);
                                            return (
                                                <tr key={appt.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-3 font-medium text-gray-900">{appt.clientName}</td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-indigo-600 font-medium">{srv?.name}</span>
                                                            <span className="text-xs text-gray-500">{emp?.name} • {br?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{formatDateDisplay(appt.date)}</span>
                                                            <span className="text-gray-900 font-bold">{formatTimeValue(appt.time)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button
                                                            onClick={() => { setEditingAppointment(appt); }}
                                                            className="text-gray-400 hover:text-indigo-600"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800">Accesos Rápidos</h3>
                        <div className="grid gap-3">
                            <button
                                onClick={() => setEditingAppointment({
                                    branchId: branches[0]?.id || '',
                                    date: todayStr,
                                    time: 540 // 9:00 AM in minutesFromMidnight
                                })}
                                className="flex items-center gap-4 p-4 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all group"
                            >
                                <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                                    <Plus size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold">Nueva Cita</span>
                                    <span className="text-xs text-indigo-100">Agendar manualmente</span>
                                </div>
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setActiveTab('CLIENTS')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center gap-2 text-gray-600 hover:text-indigo-600">
                                    <Users size={24} />
                                    <span className="text-xs font-bold">Clientes</span>
                                </button>
                                <button onClick={() => setActiveTab('EMPLOYEES')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center gap-2 text-gray-600 hover:text-indigo-600">
                                    <User size={24} />
                                    <span className="text-xs font-bold">Empleados</span>
                                </button>
                                <button onClick={() => setActiveTab('SERVICES')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center gap-2 text-gray-600 hover:text-indigo-600">
                                    <Scissors size={24} />
                                    <span className="text-xs font-bold">Servicios</span>
                                </button>
                                <button onClick={() => setActiveTab('BRANCHES')} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center gap-2 text-gray-600 hover:text-indigo-600">
                                    <MapPin size={24} />
                                    <span className="text-xs font-bold">Sucursales</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderProfileSettings = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <User size={20} className="text-indigo-600" /> Perfil del Negocio
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label>
                            <input
                                type="text"
                                value={businessProfile.name}
                                onChange={e => setBusinessProfile({ ...businessProfile, name: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Ej. Glamour Spa"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Eslogan / Frase corta</label>
                            <input
                                type="text"
                                value={businessProfile.slogan}
                                onChange={e => setBusinessProfile({ ...businessProfile, slogan: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Ej. Tu belleza nuestra pasión"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
                            <input
                                type="email"
                                value={businessProfile.email}
                                onChange={e => setBusinessProfile({ ...businessProfile, email: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="contacto@negocio.com"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea
                                rows={3}
                                value={businessProfile.description}
                                onChange={e => setBusinessProfile({ ...businessProfile, description: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Háblanos de tu negocio..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label>
                            <input
                                type="text"
                                value={businessProfile.website}
                                onChange={e => setBusinessProfile({ ...businessProfile, website: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://www.negocio.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Globe size={16} className="text-indigo-600" /> Redes Sociales y Ubicación
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp de atención</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">+</span>
                                <input
                                    type="text"
                                    value={businessProfile.whatsappDisplay}
                                    onChange={e => setBusinessProfile({ ...businessProfile, whatsappDisplay: e.target.value })}
                                    className="w-full pl-6 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="50712345678"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Física</label>
                            <input
                                type="text"
                                value={businessProfile.address}
                                onChange={e => setBusinessProfile({ ...businessProfile, address: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Ciudad de Panamá, Vía España..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (@usuario)</label>
                            <input
                                type="text"
                                value={businessProfile.instagram}
                                onChange={e => setBusinessProfile({ ...businessProfile, instagram: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook (URL)</label>
                            <input
                                type="text"
                                value={businessProfile.facebook}
                                onChange={e => setBusinessProfile({ ...businessProfile, facebook: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        onClick={async () => {
                            setLoadingProfile(true);
                            await dataService.updateBusinessProfile(businessProfile);
                            setLoadingProfile(false);
                            setProfileSaved(true);
                            setTimeout(() => setProfileSaved(false), 3000);
                        }}
                        disabled={loadingProfile}
                    >
                        {loadingProfile ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                        {profileSaved ? '¡Guardado!' : 'Guardar Perfil'}
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderChatbotSettings = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Bot size={20} className="text-indigo-600" /> Inteligencia Artificial (Chatbot)
                        </h3>
                        <p className="text-sm text-gray-500">Configura cómo la IA atiende a tus clientes por WhatsApp.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${chatbotConfig.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {chatbotConfig.enabled ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                        <button
                            onClick={() => setChatbotConfig({ ...chatbotConfig, enabled: !chatbotConfig.enabled })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${chatbotConfig.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${chatbotConfig.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Negocio</label>
                        <select
                            value={chatbotConfig.businessType}
                            onChange={e => setChatbotConfig({ ...chatbotConfig, businessType: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="Salón de belleza y cosmetología">Salón de belleza y cosmetología</option>
                            <option value="Clínica Médica / Dental">Clínica Médica / Dental</option>
                            <option value="Taller Mecánico">Taller Mecánico</option>
                            <option value="Consultoría / Legal">Consultoría / Legal</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Saludo Inicial</label>
                        <input
                            type="text"
                            value={chatbotConfig.greeting}
                            onChange={e => setChatbotConfig({ ...chatbotConfig, greeting: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ej. ¡Hola! Bienvenido a Glamour Spa. ¿Cómo puedo ayudarte hoy?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Personalidad de la IA</label>
                        <textarea
                            rows={3}
                            value={chatbotConfig.personality}
                            onChange={e => setChatbotConfig({ ...chatbotConfig, personality: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ej. Eres una asistente amable, profesional y muy atenta a los detalles..."
                        />
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <h4 className="text-xs font-bold text-indigo-900 mb-2 uppercase flex items-center gap-1">
                            <Sparkles size={14} /> Instrucciones Avanzadas
                        </h4>
                        <textarea
                            rows={4}
                            value={chatbotConfig.customInstructions}
                            onChange={e => setChatbotConfig({ ...chatbotConfig, customInstructions: e.target.value })}
                            className="w-full p-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                            placeholder="Reglas específicas, promociones actuales, o detalles que la IA debe conocer..."
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        onClick={async () => {
                            setLoadingChatbot(true);
                            await dataService.updateChatbotConfig(chatbotConfig);
                            setLoadingChatbot(false);
                            setChatbotSaved(true);
                            setTimeout(() => setChatbotSaved(false), 3000);
                        }}
                        disabled={loadingChatbot}
                    >
                        {loadingChatbot ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                        {chatbotSaved ? '¡Guardado!' : 'Guardar Configuración'}
                    </Button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <LinkIcon size={20} className="text-indigo-600" /> Web Widget
                </h3>
                <p className="text-sm text-gray-500 mb-4">Copia este código en tu sitio web para activar el chat con IA.</p>
                <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-xs text-indigo-300 font-mono">
                        {`<script src="https://tu-dominio.com/widget.js"></script>
<script>
  window.AgendaProBot.init({
    tenantId: "${localStorage.getItem('tenantId') || 'tu-id'}"
  });
</script>`}
                    </pre>
                </div>
            </div>
        </div>
    );

    const renderWhatsAppSettings = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <MessageCircle size={20} className="text-green-600" /> API de WhatsApp Business (Meta)
                        </h3>
                        <p className="text-sm text-gray-500">Conecta tu número directamente con la API oficial de Meta.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${whatsappConfig.isConfigured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {whatsappConfig.isConfigured ? 'CONECTADO' : 'SIN CONFIGURAR'}
                        </span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
                        <input
                            type="text"
                            value={whatsappConfig.phoneNumberId}
                            onChange={e => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            placeholder="ID del número de teléfono en Meta"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Business Account ID</label>
                        <input
                            type="text"
                            value={whatsappConfig.businessAccountId}
                            onChange={e => setWhatsappConfig({ ...whatsappConfig, businessAccountId: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Access Token (System User)</label>
                        <input
                            type="password"
                            value={whatsappConfig.accessToken}
                            onChange={e => setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                        />
                    </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-100 mb-6">
                    <h4 className="text-xs font-bold text-green-900 mb-2 uppercase">Configuración de Webhook en Meta</h4>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-gray-500 font-bold">Callback URL:</p>
                            <code className="text-[10px] bg-white p-1 rounded border border-green-200 block truncate">
                                https://tu-dominio.com/api/webhooks/whatsapp/${localStorage.getItem('tenantId')}
                            </code>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold">Verify Token:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={whatsappConfig.verifyToken || 'TOKEN_PENDIENTE'}
                                    className="flex-1 text-xs bg-white p-1 rounded border border-green-200 font-mono"
                                />
                                <button className="text-xs text-indigo-600 font-bold uppercase" onClick={() => setWhatsappConfig({ ...whatsappConfig, verifyToken: Math.random().toString(36).substring(7).toUpperCase() })}>Generar</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        onClick={async () => {
                            setLoadingWaConfig(true);
                            await apiClient.post('/settings/whatsapp', whatsappConfig);
                            setLoadingWaConfig(false);
                            setWhatsappConfig({ ...whatsappConfig, isConfigured: true });
                        }}
                        disabled={loadingWaConfig}
                    >
                        {loadingWaConfig ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                        Conectar API de Meta
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderReminderSettings = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Bell size={20} className="text-indigo-600" /> Recordatorios Automáticos
                </h3>
                <div className="space-y-6">
                    <ReminderInputList
                        label="Recordatorios por Email (Antelación)"
                        value={reminderSettings.emailReminderHours}
                        onChange={(val) => setReminderSettings({ ...reminderSettings, emailReminderHours: val })}
                    />
                    <ReminderInputList
                        label="Recordatorios por WhatsApp (Antelación)"
                        value={reminderSettings.whatsappReminderHours}
                        onChange={(val) => setReminderSettings({ ...reminderSettings, whatsappReminderHours: val })}
                    />
                </div>

                <div className="mt-8 p-4 bg-orange-50 rounded-lg border border-orange-100 italic text-sm text-orange-800">
                    <p><strong>Nota:</strong> Los recordatorios por WhatsApp se envían automáticamente al número del cliente usando la API de Meta configurada anteriormente. Si la ventana de 24h está cerrada, se enviará una plantilla autorizada.</p>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={async () => {
                            await apiClient.post('/settings/reminders', {
                                emailReminders: reminderSettings.emailReminderHours,
                                whatsappReminders: reminderSettings.whatsappReminderHours
                            });
                            showToast('Configuración de recordatorios guardada', 'success');
                        }}
                    >
                        Guardar Recordatorios
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2 mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Panel de Control y Configuración</h2>
                <p className="text-gray-500">Personaliza tu negocio, configura la IA e intégrate con WhatsApp.</p>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex gap-1 border-b border-gray-200">
                {[
                    { id: 'PROFILE', label: 'Mi Perfil', icon: User },
                    { id: 'CHATBOT', label: 'Asistente IA', icon: Bot },
                    { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
                    { id: 'REMINDERS', label: 'Recordatorios', icon: Bell }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSettingsSubTab(tab.id as SettingsSubTab)}
                        className={`px-4 py-2 flex items-center gap-2 border-b-2 font-medium text-sm transition-all ${settingsSubTab === tab.id
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-tab Content Rendering */}
            <div className="mt-4">
                {settingsSubTab === 'PROFILE' && renderProfileSettings()}
                {settingsSubTab === 'CHATBOT' && renderChatbotSettings()}
                {settingsSubTab === 'WHATSAPP' && renderWhatsAppSettings()}
                {settingsSubTab === 'REMINDERS' && renderReminderSettings()}
            </div>
        </div>
    );


    const renderCalendarView = () => {
        const branchEmployees = employees.filter(e => e.branchId === selectedBranchId);

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
                            <button onClick={() => changeCalendarDate(-1)} className="p-2 hover:bg-gray-100 border-r border-gray-200 text-gray-600"><ChevronLeft size={20} /></button>
                            <div className="px-4 py-2 font-medium text-gray-800 min-w-[150px] text-center">
                                {new Date(calendarDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </div>
                            <button onClick={() => changeCalendarDate(1)} className="p-2 hover:bg-gray-100 border-l border-gray-200 text-gray-600"><ChevronRight size={20} /></button>
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
                                    const appt = dayAppointments.find(a => a.employeeId === emp.id && timeToHour(a.time) === hour);
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
                                                    <div className="text-[10px] text-indigo-400">{formatTimeValue(appt.time)} - {hour + (service ? Math.ceil(service.duration / 60) : 1)}:00</div>
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
                    <Plus size={16} className="mr-2" /> Nueva Cliente
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
                                            <button onClick={() => setEditingClient(client)} className="text-gray-500 hover:text-indigo-600"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteClient(client.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
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
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('CALENDAR')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'CALENDAR' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <CalendarIcon size={18} />
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
                                        const emp = employees.find(e => e.id === appt.employeeId);
                                        const branch = branches.find(b => b.id === appt.branchId);
                                        const srv = services.find(s => s.id === appt.serviceId);
                                        return (
                                            <tr key={appt.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{appt.clientName}</td>
                                                <td className="px-6 py-4 text-indigo-600 font-medium">{srv?.name || 'Servicio General'}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span>{formatDateDisplay(appt.date)}</span>
                                                        <span className="text-xs text-gray-500">{formatTimeValue(appt.time)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">{emp?.name || 'Desconocido'}</td>
                                                <td className="px-6 py-4">{branch?.name}</td>
                                                <td className="px-6 py-4"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{appt.status}</span></td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setEditingAppointment(appt)} className="text-indigo-600 hover:text-indigo-900"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDeleteAppointment(appt.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
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
                    active: true,
                    sesiones_totales: 1
                })}>
                    <Plus size={16} className="mr-2" /> Nuevo Servicio
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
                            <span className="text-gray-600 flex items-center gap-1"><Clock size={14} /> {srv.duration} min</span>
                            {srv.sesiones_totales && srv.sesiones_totales > 1 && (
                                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs font-bold">{srv.sesiones_totales} sesiones</span>
                            )}
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
                                    showConfirm('¿Estás seguro de que quieres eliminar este servicio?', async () => {
                                        await dataService.deleteService(srv.id);
                                        setRefreshKey(prev => prev + 1);
                                        showToast('Servicio eliminado', 'success');
                                    });
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
                }}><Plus size={16} className="mr-2" /> Nuevo Empleado</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {employees.map(emp => {
                    const branch = branches.find(b => b.id === emp.branchId);
                    return (
                        <div key={emp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingEmployeeProfile(emp)} className="p-1.5 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-white rounded-md shadow-sm border border-transparent hover:border-gray-200"><Edit2 size={14} /></button>
                                <button onClick={() => {
                                    showConfirm('¿Seguro que deseas eliminar a este empleado?', async () => {
                                        await dataService.deleteEmployee(emp.id);
                                        setRefreshKey(prev => prev + 1);
                                        showToast('Empleado eliminado', 'success');
                                    });
                                }} className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-white rounded-md shadow-sm border border-transparent hover:border-gray-200"><Trash2 size={14} /></button>
                            </div>

                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={emp.avatar} className="w-12 h-12 rounded-full object-cover" alt={emp.name} />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                                        <p className="text-xs text-gray-500">{emp.role}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 mb-4">
                                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded inline-flex items-center gap-1">
                                    <MapPin size={10} /> {branch?.name || 'Sin Sucursal'}
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
                    name: '', address: '', image: '',
                    lat: 6.1759, lng: -75.5917, serviceIds: []
                })}>
                    <Plus size={16} className="mr-2" /> Nueva Sucursal
                </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {branches.map(branch => (
                    <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                        <div className="h-40 bg-gray-200 relative">
                            <img src={branch.image} alt={branch.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingBranch(branch)} className="p-2 bg-white rounded-full text-gray-700 hover:text-indigo-600 shadow-sm"><Edit2 size={16} /></button>
                                <button onClick={() => {
                                    showConfirm('¿Eliminar esta sucursal?', async () => {
                                        await dataService.deleteBranch(branch.id);
                                        setRefreshKey(prev => prev + 1);
                                        showToast('Sucursal eliminada', 'success');
                                    });
                                }} className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 shadow-sm"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{branch.name}</h3>
                            <p className="text-sm text-gray-500 mb-3 flex items-start gap-1"><MapPin size={16} className="shrink-0 mt-0.5" /> {branch.address}</p>
                            <div className="flex flex-wrap gap-1">
                                {branch.serviceIds.slice(0, 3).map(sid => {
                                    const s = services.find(srv => srv.id === sid);
                                    return s ? <span key={sid} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{s.name}</span> : null;
                                })}
                                {branch.serviceIds.length > 3 && <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">+{branch.serviceIds.length - 3}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderScheduleEditor = () => {
        if (!editingEmployee) return null;
        const currentDay = getCurrentDaySchedule();

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 max-w-2xl w-full h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Horario de {editingEmployee.name}</h3>
                            <p className="text-sm text-gray-500">Configura la disponibilidad semanal</p>
                        </div>
                        <button onClick={() => setEditingEmployee(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>

                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                key={day.id}
                                onClick={() => setSelectedDayId(day.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedDayId === day.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {day.full}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-100 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <span className="font-semibold text-gray-700">Estado del {DAYS_OF_WEEK.find(d => d.id === selectedDayId)?.full}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={currentDay.isWorkDay} onChange={toggleDayStatus} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                <span className="ml-3 text-sm font-medium text-gray-900">{currentDay.isWorkDay ? 'Laborable' : 'Descanso'}</span>
                            </label>
                        </div>

                        {currentDay.isWorkDay && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-700">Turnos de trabajo</h4>
                                    <button onClick={addRange} className="text-indigo-600 text-sm hover:underline font-medium">+ Agregar Turno</button>
                                </div>

                                {currentDay.ranges.map((range, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Inicio</label>
                                                <select
                                                    value={range.start}
                                                    onChange={(e) => updateRange(idx, 'start', Number(e.target.value))}
                                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                                                >
                                                    {HOURS_OF_OPERATION.map(h => <option key={h} value={h}>{h}:00</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Fin</label>
                                                <select
                                                    value={range.end}
                                                    onChange={(e) => updateRange(idx, 'end', Number(e.target.value))}
                                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                                                >
                                                    {HOURS_OF_OPERATION.map(h => <option key={h} value={h}>{h}:00</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <button onClick={() => removeRange(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                {currentDay.ranges.length === 0 && (
                                    <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">Agrega al menos un turno o marca como descanso.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setEditingEmployee(null)}>Cancelar</Button>
                        <Button onClick={handleSaveSchedule}>Guardar Horario</Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderServiceAssignModal = () => {
        if (!assigningServicesEmployee) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 max-w-md w-full flex flex-col max-h-[80vh]">
                    <h3 className="font-bold text-xl mb-4">Asignar Servicios</h3>
                    <p className="text-sm text-gray-500 mb-4">Selecciona los servicios que {assigningServicesEmployee.name} puede realizar.</p>

                    <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1 mb-4">
                        {services.map(srv => {
                            const isSelected = tempServiceIds.includes(srv.id);
                            return (
                                <div
                                    key={srv.id}
                                    onClick={() => {
                                        if (isSelected) setTempServiceIds(prev => prev.filter(id => id !== srv.id));
                                        else setTempServiceIds(prev => [...prev, srv.id]);
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                >
                                    <span className={`text-sm ${isSelected ? 'font-medium text-indigo-900' : 'text-gray-700'}`}>{srv.name}</span>
                                    {isSelected && <CheckCircle size={16} className="text-indigo-600" />}
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setAssigningServicesEmployee(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            const updated = { ...assigningServicesEmployee, serviceIds: tempServiceIds };
                            dataService.updateEmployee(updated);
                            setAssigningServicesEmployee(null);
                            setRefreshKey(prev => prev + 1);
                        }}>Guardar</Button>
                    </div>
                </div>
            </div>
        )
    };

    const renderEmployeeProfileModal = () => {
        if (!editingEmployeeProfile) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
                    <h3 className="font-bold text-xl mb-2">{editingEmployeeProfile.id ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre Completo</label>
                        <input
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editingEmployeeProfile.name}
                            onChange={e => setEditingEmployeeProfile({ ...editingEmployeeProfile, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cargo / Rol</label>
                        <input
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editingEmployeeProfile.role}
                            onChange={e => setEditingEmployeeProfile({ ...editingEmployeeProfile, role: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal Base</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editingEmployeeProfile.branchId}
                            onChange={e => setEditingEmployeeProfile({ ...editingEmployeeProfile, branchId: e.target.value })}
                        >
                            <option value="">Seleccionar Sucursal</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Avatar URL</label>
                        <input
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editingEmployeeProfile.avatar}
                            onChange={e => setEditingEmployeeProfile({ ...editingEmployeeProfile, avatar: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setEditingEmployeeProfile(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            if (editingEmployeeProfile.id) {
                                dataService.updateEmployee(editingEmployeeProfile as Employee);
                            } else {
                                dataService.addEmployee({
                                    name: editingEmployeeProfile.name!,
                                    role: editingEmployeeProfile.role!,
                                    branchId: editingEmployeeProfile.branchId!,
                                    avatar: editingEmployeeProfile.avatar || 'https://via.placeholder.com/100',
                                    weeklySchedule: editingEmployeeProfile.weeklySchedule || [],
                                    serviceIds: editingEmployeeProfile.serviceIds || []
                                });
                            }
                            setEditingEmployeeProfile(null);
                            setRefreshKey(prev => prev + 1);
                        }}>Guardar</Button>
                    </div>
                </div>
            </div>
        )
    };

    const renderClientModal = () => {
        if (!editingClient) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
                    <h3 className="font-bold text-xl">{editingClient.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                    <input placeholder="Nombre" value={editingClient.name} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} className="w-full border p-2 rounded" />
                    <input placeholder="Teléfono" value={editingClient.phone} onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })} className="w-full border p-2 rounded" />
                    <input placeholder="Email" value={editingClient.email} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} className="w-full border p-2 rounded" />
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditingClient(null)}>Cancelar</Button>
                        <Button onClick={handleSaveClient}>Guardar</Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderAppointmentModal = () => {
        if (!editingAppointment) return null;

        // Filter employees by selected branch in modal or default
        const modalBranchId = editingAppointment.branchId || selectedBranchId;
        const modalEmployees = employees.filter(e => e.branchId === modalBranchId);
        // Filter services by branch
        const modalBranch = branches.find(b => b.id === modalBranchId);
        const modalServices = modalBranch ? services.filter(s => (modalBranch.serviceIds || []).includes(s.id)) : [];

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl">{editingAppointment.id ? 'Editar Cita' : 'Nueva Cita'}</h3>
                        <button onClick={() => setEditingAppointment(null)}><X size={20} /></button>
                    </div>

                    <div className="space-y-3">
                        {/* Branch Selection */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Sucursal</label>
                            <select
                                value={editingAppointment.branchId || ''}
                                onChange={e => setEditingAppointment({ ...editingAppointment, branchId: e.target.value, employeeId: '', serviceId: '' })}
                                className="w-full p-2 border rounded bg-white"
                            >
                                <option value="">Seleccionar Sucursal</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        {/* Client Selection (Simplified for Admin) */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                            <select
                                value={editingAppointment.clientId || ''}
                                onChange={e => setEditingAppointment({ ...editingAppointment, clientId: e.target.value })}
                                className="w-full p-2 border rounded bg-white"
                            >
                                <option value="">Seleccionar Cliente</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">¿Cliente nuevo? Créalo primero en la pestaña Clientes.</p>
                        </div>

                        {/* Service Selection */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Servicio</label>
                            <select
                                value={editingAppointment.serviceId || ''}
                                onChange={e => setEditingAppointment({ ...editingAppointment, serviceId: e.target.value })}
                                className="w-full p-2 border rounded bg-white"
                                disabled={!editingAppointment.branchId}
                            >
                                <option value="">Seleccionar Servicio</option>
                                {modalServices.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>)}
                            </select>
                        </div>

                        {/* Employee Selection */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Profesional</label>
                            <select
                                value={editingAppointment.employeeId || ''}
                                onChange={e => setEditingAppointment({ ...editingAppointment, employeeId: e.target.value })}
                                className="w-full p-2 border rounded bg-white"
                                disabled={!editingAppointment.branchId || !editingAppointment.serviceId}
                            >
                                <option value="">Seleccionar Profesional</option>
                                {modalEmployees.filter(e => e.serviceIds.includes(editingAppointment.serviceId!)).map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                <input
                                    type="date"
                                    value={editingAppointment.date || ''}
                                    onChange={e => setEditingAppointment({ ...editingAppointment, date: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Hora</label>
                                <select
                                    value={editingAppointment.time ?? ''}
                                    onChange={e => setEditingAppointment({ ...editingAppointment, time: Number(e.target.value) })}
                                    className="w-full p-2 border rounded bg-white"
                                >
                                    <option value="">Hora</option>
                                    {SCHEDULE_HALF_HOURS.filter(h => h >= 8 && h <= 19).map(h => {
                                        const mins = Math.floor(h) * 60 + (h % 1 === 0.5 ? 30 : 0);
                                        return <option key={h} value={mins}>{formatScheduleHour(h)}</option>;
                                    })}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-between">
                        <div>
                            {editingAppointment.id && (
                                <Button variant="secondary" onClick={() => handleDeleteAppointment(editingAppointment.id!)}>
                                    <Trash2 size={16} className="mr-1" /> Eliminar
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setEditingAppointment(null)}>Cancelar</Button>
                            <Button onClick={handleSaveAppointment}>Guardar Cita</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderClientHistoryModal = () => {
        if (!viewingClientHistory) return null;
        const history = clientHistory;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 max-w-2xl w-full flex flex-col max-h-[80vh]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold">Historial de {viewingClientHistory.name}</h3>
                            <p className="text-sm text-gray-500">{viewingClientHistory.email} • {viewingClientHistory.phone}</p>
                        </div>
                        <button onClick={() => setViewingClientHistory(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {loadingClientHistory ? (
                            <div className="text-center py-10 text-gray-400">Cargando...</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">Sin citas registradas.</div>
                        ) : (
                            history.slice(0, historyLimit).map(appt => {
                                const srv = services.find(s => s.id === appt.serviceId);
                                const emp = employees.find(e => e.id === appt.employeeId);
                                const br = branches.find(b => b.id === appt.branchId);
                                return (
                                    <div key={appt.id} className="border border-gray-100 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{srv?.name}</h4>
                                            <p className="text-sm text-gray-500">{formatDateDisplay(appt.date)} a las {formatTimeValue(appt.time)}</p>
                                            <p className="text-xs text-indigo-600 mt-1">{emp?.name} @ {br?.name}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {appt.status}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                        {history.length > historyLimit && (
                            <button onClick={() => setHistoryLimit(prev => prev + 5)} className="w-full py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                Cargar más
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderBranchModal = () => {
        if (!editingBranch) return null;

        // Default location (Medellin/Sabaneta center approx) if not set
        const mapCenter: [number, number] = [
            editingBranch.lat || 6.17,
            editingBranch.lng || -75.60
        ];

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full flex flex-col max-h-[90vh]">
                    <h3 className="font-bold mb-4 text-xl">
                        {editingBranch.id ? 'Editar Sucursal' : 'Nueva Sucursal'}
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                                    <input
                                        placeholder="Ej. Sede Central"
                                        value={editingBranch.name}
                                        onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })}
                                        className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
                                    <input
                                        placeholder="Ej. Calle 10 #20-30"
                                        value={editingBranch.address}
                                        onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })}
                                        className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Imagen URL</label>
                                    <input
                                        placeholder="https://..."
                                        value={editingBranch.image}
                                        onChange={e => setEditingBranch({ ...editingBranch, image: e.target.value })}
                                        className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Latitud</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={editingBranch.lat || ''}
                                            onChange={e => setEditingBranch({ ...editingBranch, lat: parseFloat(e.target.value) })}
                                            className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Longitud</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={editingBranch.lng || ''}
                                            onChange={e => setEditingBranch({ ...editingBranch, lng: parseFloat(e.target.value) })}
                                            className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Map Section */}
                            <div className="h-64 rounded-lg overflow-hidden border border-gray-200 relative">
                                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <LocationPicker
                                        position={editingBranch.lat && editingBranch.lng ? { lat: editingBranch.lat, lng: editingBranch.lng } : null}
                                        onLocationSelect={(lat, lng) => setEditingBranch({ ...editingBranch, lat, lng })}
                                    />
                                </MapContainer>
                                <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-xs rounded shadow-sm z-[1000]">
                                    Click o arrastra el marcador para ubicar
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Servicios Disponibles</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2">
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
                                            {isSelected && <CheckCircle size={16} className="text-indigo-600" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setEditingBranch(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            if (editingBranch.id) dataService.updateBranch(editingBranch as Branch);
                            else dataService.addBranch(editingBranch as Branch);
                            setEditingBranch(null);
                            setRefreshKey(prev => prev + 1);
                        }}>Guardar</Button>
                    </div>
                </div>
            </div>
        )
    }

    const renderServiceEditorModal = () => {
        if (!editingService) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                    <h3 className="font-bold">Servicio</h3>
                    <input placeholder="Nombre" value={editingService.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })} className="w-full border p-2 rounded bg-white text-gray-900" />
                    <textarea placeholder="Descripción" value={editingService.description} onChange={e => setEditingService({ ...editingService, description: e.target.value })} className="w-full border p-2 rounded bg-white text-gray-900" />
                    <div className="flex gap-2">
                        <input type="number" placeholder="Duración (min)" value={editingService.duration} onChange={e => setEditingService({ ...editingService, duration: Number(e.target.value) })} className="w-full border p-2 rounded bg-white text-gray-900" title="Duración en minutos" />
                        <input type="number" placeholder="Precio" value={editingService.price} onChange={e => setEditingService({ ...editingService, price: Number(e.target.value) })} className="w-full border p-2 rounded bg-white text-gray-900" title="Precio del servicio" />
                        <input type="number" placeholder="Sesiones (Ej. 1)" value={editingService.sesiones_totales || 1} onChange={e => setEditingService({ ...editingService, sesiones_totales: Number(e.target.value) })} className="w-full border p-2 rounded bg-white text-gray-900" title="Número de sesiones" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditingService(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            if (editingService.id) dataService.updateService(editingService as Service);
                            else dataService.addService(editingService as Service);
                            setEditingService(null);
                            setRefreshKey(prev => prev + 1);
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
                <button onClick={onLogout}><LogOut size={20} /></button>
            </div>

            <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 overflow-y-auto h-screen">
                <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('DASHBOARD')} className="px-4 py-2 rounded-full bg-white text-sm whitespace-nowrap">Resumen</button>
                    <button onClick={() => setActiveTab('APPOINTMENTS')} className="px-4 py-2 rounded-full bg-white text-sm whitespace-nowrap">Citas</button>
                    <button onClick={() => setActiveTab('CLIENTS')} className="px-4 py-2 rounded-full bg-white text-sm whitespace-nowrap">Clientes</button>
                    <button onClick={() => setActiveTab('SERVICES')} className="px-4 py-2 rounded-full bg-white text-sm whitespace-nowrap">Servicios</button>
                    <button onClick={() => setActiveTab('MESSAGES')} className="px-4 py-2 rounded-full bg-white text-sm whitespace-nowrap relative">
                        Mensajes {unreadMsgCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1">{unreadMsgCount}</span>}
                    </button>
                    <button onClick={() => setActiveTab('SETTINGS')} className="px-4 py-2 rounded-full bg-white text-sm whitespace-nowrap">Config</button>
                </div>

                {activeTab === 'DASHBOARD' && renderOverview()}
                {activeTab === 'APPOINTMENTS' && renderAppointments()}
                {activeTab === 'CLIENTS' && renderClients()}
                {activeTab === 'SERVICES' && renderServices()}
                {activeTab === 'EMPLOYEES' && renderEmployees()}
                {activeTab === 'BRANCHES' && renderBranches()}
                {activeTab === 'SETTINGS' && renderSettings()}
                {activeTab === 'MESSAGES' && renderMessages()}
            </main>

            {renderScheduleEditor()}
            {renderServiceAssignModal()}
            {renderEmployeeProfileModal()}
            {renderBranchModal()}
            {renderServiceEditorModal()}
            {renderAppointmentModal()}
            {renderClientModal()}
            {renderClientHistoryModal()}

            {/* Toast Notification */}
            <div className={`fixed top-6 right-6 z-[100] transition-all duration-300 ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md text-sm font-medium max-w-md ${toast.type === 'success' ? 'bg-green-50/95 border-green-200 text-green-800' :
                    toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
                        toast.type === 'warning' ? 'bg-amber-50/95 border-amber-200 text-amber-800' :
                            'bg-blue-50/95 border-blue-200 text-blue-800'
                    }`}>
                    <span className="text-lg">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '⚠' : 'ℹ'}</span>
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="ml-2 opacity-50 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Confirm Dialog */}
            {confirmDialog.visible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-5 border border-gray-100">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 rounded-xl">
                                <Trash2 size={20} className="text-red-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg">Confirmar acción</h4>
                                <p className="text-sm text-gray-600 mt-1">{confirmDialog.message}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={handleConfirmCancel}>Cancelar</Button>
                            <button
                                onClick={handleConfirmAccept}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
                            >
                                Sí, confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;