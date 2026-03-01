import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { dataService } from '../services/dataService';

// Supabase client for auth (frontend only, uses anon key)
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

import { ViewState } from '../types';

interface LoginPageProps {
    onSuccess: (view?: ViewState) => void;
    onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onBack }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);

    const evaluateUserRoleAndRoute = async (email: string) => {
        try {
            await resolveTenant(email);

            // Fetch employees and clients to see what role they have
            const employees = await dataService.getEmployees();
            if (employees.some(e => e.email?.toLowerCase() === email.toLowerCase())) {
                onSuccess('EMPLOYEE_DASHBOARD');
                return;
            }

            const clients = await dataService.getClients();
            // If they are explicitly marked as clients (no admin override)
            if (clients.some(c => c.email.toLowerCase() === email.toLowerCase()) && !email.includes('admin')) {
                onSuccess('CLIENT_PROFILE');
                return;
            }

            // Default
            onSuccess('ADMIN_DASHBOARD');
        } catch (e) {
            onSuccess('ADMIN_DASHBOARD');
        }
    };

    // Check if coming back from Google OAuth redirect
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    // Store token for API calls
                    localStorage.setItem('token', session.access_token);
                    await evaluateUserRoleAndRoute(session.user.email || '');
                    return;
                }
            } catch (e) {
                console.warn('Session check failed, proceeding with manual login');
            } finally {
                setCheckingSession(false);
            }
        };
        checkSession();

        // Listen for auth state changes (OAuth redirect)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                localStorage.setItem('token', session.access_token);
                await evaluateUserRoleAndRoute(session.user.email || '');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const resolveTenant = async (email: string) => {
        // Try to find company by email domain
        const domain = email.split('@')[1];
        // For demo: set vegano tenant directly if domain matches
        if (domain === 'vegano.co' || email.includes('vegano')) {
            localStorage.setItem('tenantId', 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161');
        } else {
            // Default to the vegano company for demo purposes
            localStorage.setItem('tenantId', 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161');
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (mode === 'REGISTER') {
            if (!email || !password || !companyName) {
                setError('Email, contraseña y nombre del negocio son obligatorios.');
                setLoading(false);
                return;
            }

            try {
                // 1. Create user in Supabase
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { company_name: companyName } }
                });

                if (authError) throw authError;

                if (authData.session) {
                    localStorage.setItem('token', authData.session.access_token);

                    // 2. Register Tenant in DB
                    const newCompany = await dataService.registerCompany({
                        nombre: companyName,
                        email: email,
                        telefono: phone || ''
                    });

                    // 3. Set Tenant Context
                    localStorage.setItem('tenantId', newCompany.id);
                    await evaluateUserRoleAndRoute(email);
                    return;
                } else {
                    setError('Se ha enviado un correo de confirmación. Por favor revisa tu bandeja de entrada.');
                }
            } catch (err: any) {
                console.error('Registration error:', err);
                setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.');
            }
            setLoading(false);
            return;
        }

        // --- LOGIN FLOW ---
        if (email && password) {
            try {
                const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
                if (!authError && data.session) {
                    localStorage.setItem('token', data.session.access_token);
                    // Resolve tenant from the user's assigned company logic or fallback domain check
                    // As a simple mapping for MVP, we get their empresa via /empresas/me utilizing X-Tenant-Id hack or user metadata:
                    // Usually we'd look up the user in a `usuarios` table. For MVP demo, if not vegano, we will just use vegano ID
                    await evaluateUserRoleAndRoute(email);
                    return;
                }
            } catch (e) {
                // Proceed to demo fallback
            }

            // Demo fallback
            if ((email === 'admin' && password === 'admin') || (email === 'admin@vegano.co') || (password.length >= 4)) {
                localStorage.setItem('tenantId', 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161');
                await evaluateUserRoleAndRoute(email);
            } else {
                setError('Credenciales incorrectas. Usa admin@vegano.co o crea una cuenta nueva.');
            }
        } else {
            setError('Por favor ingresa email y contraseña.');
        }

        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}${window.location.pathname}?view=admin`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });
            if (error) {
                setError('Error al iniciar sesión con Google. Verifica la configuración OAuth.');
                setGoogleLoading(false);
            }
            // If no error, browser will redirect to Google
        } catch (e: any) {
            setError('Error de conexión con Google.');
            setGoogleLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-green-700 font-medium">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full opacity-30 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-300 rounded-full opacity-20 blur-3xl" />
            </div>

            <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-green-100">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-green-200">
                        <span className="text-white text-2xl font-black">V</span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">vegano</h1>
                    <p className="text-sm text-gray-500 mt-1">Acceso al panel administrativo</p>
                </div>

                {/* Google Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 mb-6 disabled:opacity-60 shadow-sm"
                >
                    {googleLoading ? (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                        </svg>
                    )}
                    {googleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">O INGRESA TUS DATOS</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    {mode === 'REGISTER' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del Negocio</label>
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50 focus:bg-white"
                                    placeholder="Mi Salón Spa"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono (WhatsApp)</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50 focus:bg-white"
                                    placeholder="+57 300 000 0000"
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50 focus:bg-white"
                            placeholder="admin@vegano.co"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50 focus:bg-white"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 text-sm py-3 px-4 rounded-xl flex items-center gap-2">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-60 shadow-lg shadow-green-200 mt-2"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{mode === 'LOGIN' ? 'Ingresando...' : 'Creando cuenta...'}</span>
                            </div>
                        ) : (mode === 'LOGIN' ? 'Ingresar al Panel' : 'Registrar Negocio')}
                    </button>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                                setError('');
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            {mode === 'LOGIN' ? '¿No tienes cuenta? Registra tu negocio' : '¿Ya tienes cuenta? Inicia sesión'}
                        </button>
                    </div>
                </form>

                {/* Demo hint */}
                {mode === 'LOGIN' && (
                    <div className="mt-6 bg-green-50 border border-green-100 rounded-xl p-4">
                        <p className="text-xs text-green-700 font-semibold mb-1">💡 Acceso de demostración</p>
                        <p className="text-xs text-green-600">Usuario: <code className="bg-green-100 px-1 rounded">admin@vegano.co</code></p>
                        <p className="text-xs text-green-600">Contraseña: <code className="bg-green-100 px-1 rounded">cualquiera (min 4 chars)</code></p>
                    </div>
                )}

                <button
                    onClick={onBack}
                    className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4 transition-colors"
                >
                    ← Volver al inicio
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
