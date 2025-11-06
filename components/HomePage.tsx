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
        <div className="animate-fade-in text-center">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Welcome back, {user.name}!</h2>
            
            <div className={`grid ${user.isGuest ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-2'} gap-6`}>
                {/* Create Room (only for registered users) */}
                {!user.isGuest && (
                     <div className="bg-slate-700/50 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-semibold mb-4">Create a New Room</h3>
                        <button 
                            onClick={onCreateRoom}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Create & Customize Quiz
                        </button>
                    </div>
                )}

                {/* Join Room (for all users) */}
                <div className="bg-slate-700/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-xl font-semibold mb-4">Join an Existing Room</h3>
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
                            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            Join Room
                        </button>
                    </form>
                </div>

                {/* Profile & Insights (only for registered users) */}
                {!user.isGuest && (
                    <>
                        {/* Profile */}
                        <div className="bg-slate-700/50 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
                            <button 
                                onClick={onViewProfile}
                                className="w-full bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-500 transition-colors"
                            >
                                View & Edit Profile
                            </button>
                        </div>
                        {/* Insights */}
                        <div className="bg-slate-700/50 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-xl font-semibold mb-4">Personal Insights</h3>
                            <button 
                                onClick={onViewInsights}
                                disabled={hasViewedInsightsToday}
                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {hasViewedInsightsToday ? 'Insights Viewed Today' : 'Get Daily AI Insights'}
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