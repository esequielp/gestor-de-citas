import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, MapPin, Calendar, Clock, User, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { chatApiService } from '../../services/chatApiService';
import { dataService } from '../../../services/dataService';
import { Service, Branch, Employee } from '../../../types';

// Convert YYYY-MM-DD to dd/mm/YYYY for display
const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    options?: {
        type: 'service' | 'branch' | 'date' | 'time' | 'professional' | 'confirmation';
        data: any[];
    };
}

interface BookingState {
    service?: Service;
    branch?: Branch;
    date?: string;
    time?: string;
    professional?: Employee;
    clientName?: string;
    clientEmail?: string;
}

const ChatWidget: React.FC<{ isEmbed?: boolean }> = ({ isEmbed }) => {
    const [isOpen, setIsOpen] = useState(isEmbed || false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [booking, setBooking] = useState<BookingState>({});
    const [chatbotGreeting, setChatbotGreeting] = useState('');
    const [webClientId, setWebClientId] = useState<string>('');
    const [aiDisabled, setAiDisabled] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Generate / Retrieve Web Client ID
    useEffect(() => {
        let id = localStorage.getItem('web_chat_client_id');
        if (!id) {
            id = 'WEB-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('web_chat_client_id', id);
        }
        setWebClientId(id);
    }, []);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Load tenant chatbot config
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await dataService.getChatbotConfig();
                setChatbotGreeting(config.greeting || '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?');
            } catch (e) {
                setChatbotGreeting('¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?');
            }
        };
        loadConfig();
    }, []);

    // Check if AI is disabled for this specific client
    useEffect(() => {
        const checkAiStatus = async () => {
            if (!webClientId) return;
            try {
                // Here we could have a specific endpoint or use existing ones
                const chats = await dataService.getChats();
                const currentChat = chats.find(c => c.id === webClientId);
                if (currentChat) {
                    setAiDisabled(currentChat.ai_disabled || false);
                }
            } catch (e) { }
        };
        checkAiStatus();
        const interval = setInterval(checkAiStatus, 10000); // Check status every 10s
        return () => clearInterval(interval);
    }, [webClientId]);

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('chat_messages');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.length > 0) setMessages(parsed);
            } catch (e) {
                console.error("Error loading chat history", e);
            }
        }

        const savedBooking = localStorage.getItem('chat_booking');
        if (savedBooking) {
            try {
                setBooking(JSON.parse(savedBooking));
            } catch (e) {
                console.error("Error loading booking state", e);
            }
        }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('chat_messages', JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        if (Object.keys(booking).length > 0) {
            localStorage.setItem('chat_booking', JSON.stringify(booking));
        }
    }, [booking]);

    const clearChat = () => {
        const greeting = chatbotGreeting || '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?';
        setMessages([{
            id: Date.now().toString(),
            sender: 'bot',
            text: greeting
        }]);
        setBooking({});
        localStorage.removeItem('chat_messages');
        localStorage.removeItem('chat_booking');
    };

    // Initial greeting
    useEffect(() => {
        if (isOpen && messages.length === 0 && chatbotGreeting) {
            addBotMessage(chatbotGreeting);
        }
    }, [isOpen, chatbotGreeting, messages.length]);

    const addBotMessage = async (text: string, options?: Message['options']) => {
        setIsTyping(true);
        // Save bot message (SALIENTE for the admin inbox)
        try {
            const tenantId = localStorage.getItem('tenantId') || 'demo';
            await dataService.saveMessage({
                empresaId: tenantId,
                clientId: webClientId,
                text,
                via: 'WEB_CHAT',
                tipo: 'SALIENTE'
            });
            // Note: The previous saveMessage defaults to ENTRANTE, but bot messages should be SALIENTE in the inbox.
            // I'll adjust the backend save-direct to handle a 'tipo' parameter if needed, 
            // or just let it be ENTRANTE for now for simplicity of the Inbox view (seeing the whole sequence).
        } catch (e) { }

        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                sender: 'bot',
                text,
                options
            }]);
            setIsTyping(false);
        }, 1000);
    };

    const addUserMessage = async (text: string) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'user',
            text
        }]);

        // Save to DB (ENTRANTE for the admin inbox)
        try {
            const tenantId = localStorage.getItem('tenantId') || 'demo';
            await dataService.saveMessage({
                empresaId: tenantId,
                clientId: webClientId,
                nombre: booking.clientName || 'Usuario Web',
                email: booking.clientEmail,
                text,
                via: 'WEB_CHAT'
            });
        } catch (e) { }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const text = input;
        setInput('');
        addUserMessage(text);

        // --- LOGIC FLOW ---

        // 1. Check if we are waiting for client data (Name/Email)
        if (booking.service && booking.branch && booking.date && booking.time && !booking.clientName) {
            // Assume input is name
            setBooking(prev => ({ ...prev, clientName: text }));
            addBotMessage(`Gracias ${text}. Por favor, indícame tu correo electrónico para enviarte la confirmación.`);
            return;
        }

        if (booking.clientName && !booking.clientEmail) {
            // Assume input is email
            setBooking(prev => ({ ...prev, clientEmail: text }));
            // Proceed to confirmation
            addBotMessage("Perfecto. Estoy procesando tu reserva...", {
                type: 'confirmation',
                data: []
            });

            // Simulate API call
            try {
                const result = await chatApiService.createAppointment({
                    ...booking,
                    clientEmail: text
                });
                setTimeout(() => {
                    addBotMessage(`¡Listo! Tu cita ha sido confirmada. Te enviamos los detalles a ${text}.`);
                }, 2000);
            } catch (e) {
                addBotMessage("Hubo un error al confirmar. Por favor intenta nuevamente.");
            }
            return;
        }

        // 2. Analyze intent for Service Recommendation (IA) - ONLY IF AI IS ENABLED
        if (!aiDisabled && !booking.service) {
            const result = await chatApiService.recommendService(text);

            if (result.service) {
                addBotMessage(`${result.explanation} ¿Te gustaría agendar una cita para **${result.service.name}**?`, {
                    type: 'service',
                    data: [result.service]
                });
            } else {
                // La IA no encontró coincidencia, mostrar catálogo completo
                const services = await chatApiService.getServices();
                const fallbackMsg = result.explanation || "No encontré un servicio específico para tu necesidad, pero aquí tienes nuestro catálogo completo:";
                addBotMessage(fallbackMsg, {
                    type: 'service',
                    data: services
                });
            }
            return;
        }

        // 3. If we are in the middle of a booking and user types free text
        if (booking.service) {
            const lowerText = text.toLowerCase();

            // Handle "change branch" / "otra sede"
            if (lowerText.includes('otra sede') || lowerText.includes('otra sucursal') || lowerText.includes('cambiar sede') || lowerText.includes('cambiar sucursal') || lowerText.includes('que sede') || lowerText.includes('qué sede')) {
                setBooking(prev => ({ ...prev, branch: undefined, date: undefined, time: undefined, professional: undefined }));
                const branches = await chatApiService.getBranches();
                addBotMessage("¡Claro! Estas son las sucursales disponibles:", {
                    type: 'branch',
                    data: branches
                });
                return;
            }

            // Handle "change date" / "otro día"
            if (lowerText.includes('otro día') || lowerText.includes('otro dia') || lowerText.includes('cambiar fecha') || lowerText.includes('otra fecha')) {
                setBooking(prev => ({ ...prev, date: undefined, time: undefined, professional: undefined }));
                const dates = [];
                const today = new Date();
                for (let i = 1; i <= 3; i++) {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
                addBotMessage("¿Qué día te acomoda más?", {
                    type: 'date',
                    data: dates.map(d => ({ value: d, label: formatDateDisplay(d) }))
                });
                return;
            }

            // Handle "change service" / "otro servicio"
            if (lowerText.includes('otro servicio') || lowerText.includes('cambiar servicio')) {
                setBooking({});
                const services = await chatApiService.getServices();
                addBotMessage("¡Claro! Aquí tienes nuestro catálogo:", {
                    type: 'service',
                    data: services
                });
                return;
            }

            // Use AI for general conversation during booking - ONLY IF AI IS ENABLED
            if (!aiDisabled) {
                const result = await chatApiService.chat(text);
                addBotMessage(result);
                return;
            }
        }

        // Fallback: Use AI for general conversation - ONLY IF AI IS ENABLED
        if (!aiDisabled) {
            const generalResult = await chatApiService.chat(text);
            addBotMessage(generalResult);
        }
    };

    const handleOptionSelect = async (type: string, item: any) => {
        // Add user selection as a message for context
        let userText = '';

        if (type === 'service') {
            userText = `Quiero agendar ${item.name}`;
            setBooking(prev => ({ ...prev, service: item }));
            addUserMessage(userText);

            // Next step: Branch
            const branches = await chatApiService.getBranches();
            addBotMessage("¡Excelente elección! ¿En qué sucursal prefieres atenderte?", {
                type: 'branch',
                data: branches
            });
        }
        else if (type === 'branch') {
            userText = `En ${item.name}`;
            setBooking(prev => ({ ...prev, branch: item }));
            addUserMessage(userText);

            // Next step: Date
            // Calcular próximos 3 días
            const dates = [];
            const today = new Date();
            for (let i = 1; i <= 3; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                dates.push(d.toISOString().split('T')[0]);
            }

            addBotMessage("¿Qué día te acomoda más?", {
                type: 'date',
                data: dates.map(d => ({ value: d, label: formatDateDisplay(d) }))
            });
        }
        else if (type === 'date') {
            const dateValue = typeof item === 'object' ? item.value : item;
            const dateLabel = typeof item === 'object' ? item.label : formatDateDisplay(item);
            userText = `El día ${dateLabel}`;
            setBooking(prev => ({ ...prev, date: dateValue }));
            addUserMessage(userText);

            // Next step: Time (Check availability)
            const slots = await chatApiService.getAvailability(dateValue, booking.branch?.id, booking.service?.id);
            if (slots.length === 0) {
                // Recalcular próximas 2 fechas para sugerir
                const fallbackDates = [];
                const today = new Date(dateValue);
                for (let i = 1; i <= 2; i++) {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i);
                    fallbackDates.push(d.toISOString().split('T')[0]);
                }
                addBotMessage("Lo siento, no hay horas disponibles para ese día. Por favor elige otro.", {
                    type: 'date',
                    data: fallbackDates.map(d => ({ value: d, label: formatDateDisplay(d) }))
                });
            } else {
                addBotMessage("Estos son los horarios disponibles:", {
                    type: 'time',
                    data: slots
                });
            }
        }
        else if (type === 'time') {
            userText = `A las ${item}`;
            setBooking(prev => ({ ...prev, time: item }));
            addUserMessage(userText);

            // Next step: Professional (Optional)
            if (booking.branch && booking.service && booking.date) {
                const employees = await chatApiService.getEmployeesForTime(booking.branch.id, booking.service.id, booking.date, item);
                if (employees.length === 1) {
                    // If there's only 1 employee available, we could auto skip, but let's just let the user pick or show "any"
                }

                addBotMessage("¿Prefieres atenderte con alguien en específico? (O puedes omitir este paso)", {
                    type: 'professional',
                    data: [...employees, { id: 'any', name: 'Cualquiera disponible', roleLabel: '-' }]
                });
            } else {
                // Failsafe
                addBotMessage("Ya casi terminamos. ¿Cuál es tu nombre completo?");
            }
        }
        else if (type === 'professional') {

            userText = item.id === 'any' ? "Cualquiera está bien" : `Con ${item.name}`;
            if (item.id !== 'any') {
                setBooking(prev => ({ ...prev, professional: item }));
            }
            addUserMessage(userText);

            // Next step: Client Data
            addBotMessage("Ya casi terminamos. ¿Cuál es tu nombre completo?");
        }
    };

    return (
        <div className={isEmbed ? "fixed inset-0 z-50 flex flex-col w-full h-full bg-white" : "fixed bottom-4 right-4 z-50 flex flex-col items-end"}>
            {/* Chat Window */}
            {(isOpen || isEmbed) && (
                <div className={`${isEmbed ? 'w-full h-full shadow-none rounded-none flex-1' : 'mb-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl'} flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-10 fade-in duration-300`}>
                    {/* Header */}
                    <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <MessageCircle size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Asistente AgendaPro</h3>
                                <p className="text-xs text-indigo-100 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    En línea
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={clearChat}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                                title="Limpiar chat"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${msg.sender === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>

                                    {/* Options Rendering */}
                                    {msg.options && (
                                        <div className="mt-3 space-y-2">
                                            {msg.options.type === 'service' && (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {msg.options.data.map((service: any) => (
                                                        <button
                                                            key={service.id}
                                                            onClick={() => handleOptionSelect('service', service)}
                                                            className="text-left p-2 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors flex justify-between items-center group"
                                                        >
                                                            <span className="font-medium text-indigo-700">{service.name}</span>
                                                            <span className="text-xs text-gray-500 group-hover:text-indigo-600">${service.price}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {msg.options.type === 'branch' && (
                                                <div className="space-y-2">
                                                    {msg.options.data.map((branch: any) => (
                                                        <button
                                                            key={branch.id}
                                                            onClick={() => handleOptionSelect('branch', branch)}
                                                            className="w-full text-left p-2 hover:bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-2 text-indigo-700"
                                                        >
                                                            <MapPin size={14} />
                                                            <span className="font-medium">{branch.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {msg.options.type === 'date' && (
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.options.data.map((date: any) => (
                                                        <button
                                                            key={typeof date === 'object' ? date.value : date}
                                                            onClick={() => handleOptionSelect('date', date)}
                                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium hover:bg-indigo-100 border border-indigo-200"
                                                        >
                                                            {typeof date === 'object' ? date.label : formatDateDisplay(date)}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {msg.options.type === 'time' && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {msg.options.data.map((time: string) => (
                                                        <button
                                                            key={time}
                                                            onClick={() => handleOptionSelect('time', time)}
                                                            className="px-2 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                                                        >
                                                            {time}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {msg.options.type === 'professional' && (
                                                <div className="space-y-2">
                                                    {msg.options.data.map((prof: any) => (
                                                        <button
                                                            key={prof.id}
                                                            onClick={() => handleOptionSelect('professional', prof)}
                                                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                                                        >
                                                            {prof.avatarUrl ? (
                                                                <img src={prof.avatarUrl} alt={prof.name} className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                                                    <User size={14} />
                                                                </div>
                                                            )}
                                                            <div className="text-left">
                                                                <p className="text-sm font-medium text-gray-800">{prof.name}</p>
                                                                <p className="text-xs text-gray-500">{prof.roleLabel}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {msg.options.type === 'confirmation' && booking.service && (
                                                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-sm space-y-2">
                                                    <div className="flex items-center gap-2 text-green-700 font-medium pb-2 border-b border-green-100">
                                                        <CheckCircle size={16} />
                                                        Resumen de Cita
                                                    </div>
                                                    <div className="space-y-1 text-gray-600">
                                                        <p><span className="font-medium">Servicio:</span> {booking.service.name}</p>
                                                        <p><span className="font-medium">Fecha:</span> {formatDateDisplay(booking.date || '')} a las {booking.time}</p>
                                                        <p><span className="font-medium">Lugar:</span> {booking.branch?.name}</p>
                                                        {booking.professional && (
                                                            <p><span className="font-medium">Profesional:</span> {booking.professional.name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3 shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isEmbed && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`${isOpen ? 'bg-gray-800' : 'bg-indigo-600'} text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center`}
                >
                    {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
