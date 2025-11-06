import React, { useState } from 'react';

interface JoinScreenProps {
    onJoin: (name: string, roomId: string) => void;
    onCreate: (name: string) => void;
    onLoginClick: () => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({ onJoin, onCreate, onLoginClick }) => {
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }
        setError('');

        if (roomId.trim()) {
            onJoin(name.trim(), roomId.trim().toUpperCase());
        } else {
            onCreate(name.trim());
        }
    };

    return (
        <div className="animate-fade-in text-center max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-slate-100 mb-2">Welcome to Quizyfy!</h2>
            <p className="text-slate-400 mb-8">Join a room or create your own quiz.</p>

            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Your Name"
                    className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
                    aria-label="Your Name"
                    required
                />
                 <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Room ID (optional)"
                    className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition duration-200"
                    aria-label="Room ID"
                />
                <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                    {roomId.trim() ? 'Join Room' : 'Create a Room'}
                </button>
            </form>
            <div className="mt-6 text-slate-400">
                <p>
                    Have an account?{' '}
                    <button onClick={onLoginClick} className="font-semibold text-purple-400 hover:text-purple-300">
                        Log in or Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default JoinScreen;