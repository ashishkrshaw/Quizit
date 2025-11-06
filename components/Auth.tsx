import React, { useState } from 'react';
import type { User, AuthResponse } from '../types';
import * as api from '../services/apiService';
import { API_BASE_URL } from '../services/apiService';

declare global {
    interface Window { google?: any }
}

interface AuthProps {
    onAuthSuccess: (authResponse: AuthResponse, isNewUser: boolean) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'guest'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGuestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }
        const guestUser: User = {
            id: `guest-${Date.now()}`,
            name: name.trim(),
            isGuest: true,
        };
        // For guests, we can create a mock AuthResponse as there's no real token
        onAuthSuccess({ token: '', user: guestUser }, false);
    };

    const handleAccountSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (authMode !== 'guest') {
            if (!email || !password || (authMode === 'signup' && !name)) {
                setError('All fields are required.');
                return;
            }
        }
        
        setIsLoading(true);

        try {
            if (authMode === 'login') {
                const authResponse = await api.login(email, password);
                onAuthSuccess(authResponse, false);
            } else if (authMode === 'signup') {
                const authResponse = await api.signup(name, email, password);
                onAuthSuccess(authResponse, true);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleCredential = async (credential: string) => {
        setIsLoading(true);
        try {
            const authResponse = await api.googleSignIn(credential);
            onAuthSuccess(authResponse, false);
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
        } finally {
            setIsLoading(false);
        }
    };

    const renderGoogleButton = () => {
        try {
            const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
            // If the Google JS library is present and we have a clientId, render the official button
            if (typeof window !== 'undefined' && window.google && clientId) {
                setTimeout(() => {
                    try {
                        window.google.accounts.id.initialize({
                            client_id: clientId,
                            callback: (resp: any) => handleGoogleCredential(resp.credential),
                        });
                        window.google.accounts.id.renderButton(
                            document.getElementById('google-signin-button'),
                            { theme: 'outline', size: 'large' }
                        );
                        // Prompt can show a One Tap or hint (non-blocking). Safe to call after render.
                        try { window.google.accounts.id.prompt(); } catch (_) { /* ignore */ }
                    } catch (e) {
                        // ignore render errors in environments without the Google script
                    }
                }, 100);
                return <div id="google-signin-button" className="mx-auto" />;
            }

            // Fallback: render a simple link to the server-side OAuth redirect endpoint.
            // This works even if the Google JS SDK didn't load and avoids relying on XHR.
            const redirectBase = API_BASE_URL || '';
            const redirectHref = `${redirectBase.replace(/\/$/, '')}/api/auth/google/redirect`;
            return (
                <div className="mx-auto">
                    <a
                        href={redirectHref}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-5 border border-slate-600 rounded-md text-white hover:bg-opacity-10"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M21.6 12.227c0-.733-.066-1.382-.188-1.988H12v3.762h5.48c-.236 1.26-.952 2.33-2.04 3.052v2.54h3.296c1.93-1.777 3.04-4.39 3.04-7.366z" fill="#4285F4"/>
                            <path d="M12 22c2.7 0 4.97-.9 6.627-2.438l-3.297-2.54c-.916.616-2.09.98-3.33.98-2.557 0-4.722-1.725-5.493-4.04H3.12v2.54C4.77 19.99 8.12 22 12 22z" fill="#34A853"/>
                            <path d="M6.507 13.96A6.987 6.987 0 0 1 6 12c0-.99.185-1.94.507-2.96V6.5H3.12A10.98 10.98 0 0 0 2 12c0 1.77.36 3.45 1.12 4.98l3.387-3.02z" fill="#FBBC05"/>
                            <path d="M12 6.5c1.47 0 2.8.5 3.847 1.48l2.872-2.86C16.97 3.68 14.7 3 12 3 8.12 3 4.77 5.01 3.12 7.98l3.387 2.54C7.278 8.225 9.443 6.5 12 6.5z" fill="#EA4335"/>
                        </svg>
                        Sign in with Google
                    </a>
                </div>
            );
        } catch (e) {
            return null;
        }
    };

    const renderForm = () => {
        if (authMode === 'guest') {
            return (
                <form onSubmit={handleGuestSubmit} className="space-y-4">
                     <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter Your Name"
                        className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
                    />
                    <button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Join as Guest
                    </button>
                </form>
            );
        }

        return (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
                {authMode === 'signup' && (
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
                    />
                )}
                 <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
                />
                 <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
                />
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    {isLoading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                </button>
            </form>
        );
    }

    return (
        <div className="animate-fade-in text-center max-w-md mx-auto">
            <h2 className="text-2xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                {authMode === 'login' && 'Welcome Back'}
                {authMode === 'signup' && 'Create an Account'}
                {authMode === 'guest' && 'Join as a Guest'}
            </h2>
            <p className="text-slate-400 mb-6">Fast login. Continue with Google or use email/password.</p>
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}
            
            {renderForm()}

            <div className="mt-6 text-slate-400">
                {authMode !== 'guest' ? (
                    <>
                        {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); }} className="font-semibold text-purple-400 hover:text-purple-300 ml-2">
                            {authMode === 'login' ? 'Sign up here' : 'Login here'}
                        </button>
                        <p className="mt-2">Or</p>
                        <button onClick={() => { setAuthMode('guest'); setError(''); }} className="font-semibold text-teal-400 hover:text-teal-300 mt-1">
                            Continue as a guest
                        </button>
                        <div className="mt-4">
                            {renderGoogleButton()}
                        </div>
                    </>
                ) : (
                    <button onClick={() => { setAuthMode('login'); setError(''); }} className="font-semibold text-purple-400 hover:text-purple-300">
                        Login or Sign Up instead
                    </button>
                )}
            </div>
        </div>
    );
};

export default Auth;