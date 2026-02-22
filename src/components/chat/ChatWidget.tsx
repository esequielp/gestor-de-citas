import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, MapPin, Calendar, Clock, User, CheckCircle, Loader2 } from 'lucide-react';
import { mockApiService } from '../../services/mockApi';
import { Service, Branch, Employee } from '../../types';

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

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [booking, setBooking] = useState<BookingState>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage("¡Hola! Soy tu asistente virtual de AgendaPro. ¿En qué puedo ayudarte hoy? (Ej: 'Tengo dolor de espalda', 'Quiero depilación')");
    }
  }, [isOpen]);

  const addBotMessage = (text: string, options?: Message['options']) => {
    setIsTyping(true);
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

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      text
    }]);
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
            const result = await mockApiService.createAppointment({
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

    // 2. Analyze intent for Service Recommendation
    if (!booking.service) {
        const recommendedService = mockApiService.recommendService(text);
        
        if (recommendedService) {
            addBotMessage(`Entiendo. Según lo que me cuentas, te recomiendo nuestro servicio de **${recommendedService.name}**. ¿Te gustaría agendar una cita para esto?`, {
                type: 'service',
                data: [recommendedService]
            });
        } else {
            // If no clear recommendation, show all services
            const services = await mockApiService.getServices();
            addBotMessage("No estoy seguro de qué servicio necesitas específicamente, pero aquí tienes nuestra lista completa:", {
                type: 'service',
                data: services
            });
        }
        return;
    }

    // Fallback
    addBotMessage("¿Podrías reformular eso? Estoy aprendiendo.");
  };

  const handleOptionSelect = async (type: string, item: any) => {
    // Add user selection as a message for context
    let userText = '';
    
    if (type === 'service') {
        userText = `Quiero agendar ${item.name}`;
        setBooking(prev => ({ ...prev, service: item }));
        addUserMessage(userText);
        
        // Next step: Branch
        const branches = await mockApiService.getBranches();
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
        // Mock next 3 days
        const dates = [];
        const today = new Date();
        for(let i=1; i<=3; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        
        addBotMessage("¿Qué día te acomoda más?", {
            type: 'date',
            data: dates
        });
    }
    else if (type === 'date') {
        userText = `El día ${item}`;
        setBooking(prev => ({ ...prev, date: item }));
        addUserMessage(userText);

        // Next step: Time (Check availability)
        const slots = await mockApiService.getAvailability(item);
        if (slots.length === 0) {
            addBotMessage("Lo siento, no hay horas disponibles para ese día. Por favor elige otro.", {
                type: 'date',
                data: ['2024-10-26', '2024-10-27'] // Mock fallback
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
        if (booking.branch) {
            const employees = await mockApiService.getEmployees(booking.branch.id);
            addBotMessage("¿Prefieres atenderte con alguien en específico? (O puedes omitir este paso)", {
                type: 'professional',
                data: [...employees, { id: 'any', name: 'Cualquiera disponible', roleLabel: '-' }]
            });
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-10 fade-in duration-300">
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
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                  msg.sender === 'user' 
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
                                {msg.options.data.map((date: string) => (
                                    <button 
                                        key={date}
                                        onClick={() => handleOptionSelect('date', date)}
                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium hover:bg-indigo-100 border border-indigo-200"
                                    >
                                        {date}
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
                                    <p><span className="font-medium">Fecha:</span> {booking.date} a las {booking.time}</p>
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${isOpen ? 'bg-gray-800' : 'bg-indigo-600'} text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default ChatWidget;
