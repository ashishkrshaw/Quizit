import React, { useState } from 'react';
import { User } from '../types';

interface HomePageProps {
    onCreateRoom: () => void;
    onJoinRoom: (roomId: string) => void;
    onViewInsights: () => void;
    onViewProfile: () => void;
    user: User;
}

const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, onViewInsights, onViewProfile, user }) => {
    const [roomId, setRoomId] = useState('');

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        onJoinRoom(roomId);
    };
    
    const hasViewedInsightsToday = user.lastInsightDate === new Date().toISOString().split('T')[0];

    return (
        <div className="animate-fade-in">
            <section className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Hi, {user.name}</h2>
                <p className="text-slate-400 mt-2 max-w-xl mx-auto">Create or join quizzes quickly. Minimal UI, focused experience.</p>
            </section>

            <div className={`grid ${user.isGuest ? 'md:grid-cols-1 max-w-lg mx-auto' : 'md:grid-cols-2'} gap-6`}>
                {/* Create Room (only for registered users) */}
                {!user.isGuest && (
                     <div className="p-6 rounded-xl bg-gradient-to-b from-slate-800/60 to-slate-900/60 border border-slate-700">
                        <h3 className="text-lg font-semibold mb-3">Create a New Room</h3>
                        <p className="text-sm text-slate-400 mb-4">Design quizzes or use AI to generate questions.</p>
                        <button 
                            onClick={onCreateRoom}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:opacity-95 transition-opacity"
                        >
                            Create Quiz
                        </button>
                    </div>
                )}

                {/* Join Room (for all users) */}
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h3 className="text-lg font-semibold mb-3">Join a Room</h3>
                    <form onSubmit={handleJoin} className="space-y-4">
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            placeholder="Enter Room ID"
                            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-200"
                        />
                        <button 
                            type="submit" 
                            disabled={!roomId.trim()}
                            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium py-3 px-4 rounded-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            Join
                        </button>
                    </form>
                </div>

                {/* Profile & Insights (only for registered users) */}
                {!user.isGuest && (
                    <>
                        {/* Profile */}
                        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                            <h3 className="text-lg font-semibold mb-3">Profile</h3>
                            <button 
                                onClick={onViewProfile}
                                className="w-full bg-slate-700 text-white font-medium py-3 px-4 rounded-lg hover:opacity-95 transition-colors"
                            >
                                View Profile
                            </button>
                        </div>
                        {/* Insights */}
                        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                            <h3 className="text-lg font-semibold mb-3">Insights</h3>
                            <button 
                                onClick={onViewInsights}
                                disabled={hasViewedInsightsToday}
                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium py-3 px-4 rounded-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {hasViewedInsightsToday ? 'Viewed Today' : 'Get Insights'}
                            </button>
                        </div>
                    </>
                )}
            </div>
             {user.isGuest && <p className="mt-6 text-slate-400">To create your own quizzes and get personalized insights, please log out and create an account.</p>}
        </div>
    );
};

export default HomePage;