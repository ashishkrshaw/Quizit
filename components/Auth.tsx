import React, { useState } from 'react';
import type { User, AuthResponse } from '../types';
import * as api from '../services/apiService';

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
            <h2 className="text-2xl font-bold text-slate-100 mb-6">
                {authMode === 'login' && 'Login to Your Account'}
                {authMode === 'signup' && 'Create an Account'}
                {authMode === 'guest' && 'Join as a Guest'}
            </h2>
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}
            
            {renderForm()}

            {/* Google Sign-in button */}
            <div className="mt-6">
                <p className="text-sm text-slate-400 mb-2">Or sign in with</p>
                <GoogleSignInButton />
            </div>
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

// Small Google button component that redirects to Google's OAuth 2.0 endpoint.
const GoogleSignInButton: React.FC = () => {
    // Use Vite environment variables for client id and redirect URI.
    // Set these in your production build with VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_REDIRECT_URI.
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';
    const redirectUri = (import.meta as any).env.VITE_GOOGLE_REDIRECT_URI || '';

    const handleGoogleSignIn = () => {
        // Build Google's OAuth 2.0 URL for obtaining an authorization code.
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'profile email',
            access_type: 'offline',
            prompt: 'consent'
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        // Redirect the browser to Google's consent screen. The redirect will go to your configured redirect URI.
        window.location.href = authUrl;
    };

    return (
        <button onClick={handleGoogleSignIn} className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-900 rounded-lg hover:shadow-md transition">
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.4 1.2 8.3 2.8l6.1-6.1C34.5 3 29.6 1.5 24 1.5 14.7 1.5 6.9 7.8 3.7 15.9l7.4 5.7C12.8 15.2 17.9 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.5 24c0-1.6-.1-2.8-.4-4H24v7.6h12.7c-.5 2.8-2.2 5.2-4.7 6.8l7.3 5.6C44.3 36 46.5 30.5 46.5 24z"/>
                <path fill="#4A90E2" d="M11.1 29.2A14.6 14.6 0 0 1 10.2 24c0-1.3.2-2.6.5-3.8L3.3 14.5A23.9 23.9 0 0 0 0 24c0 3.8.9 7.5 2.6 10.8l8.5-5.6z"/>
                <path fill="#FBBC05" d="M24 46.5c6.5 0 12-2.1 16-5.7l-7.7-6.1c-2.3 1.6-5.3 2.6-8.3 2.6-6.2 0-11.6-4.2-13.5-9.9l-8.6 6.6C6.9 40.2 14.7 46.5 24 46.5z"/>
            </svg>
            <span className="font-semibold">Sign in with Google</span>
        </button>
    );
};