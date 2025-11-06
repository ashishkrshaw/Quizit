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