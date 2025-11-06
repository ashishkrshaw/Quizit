import React, { useState } from 'react';
import type { Room, Player } from '../types';
import { CopyIcon, CheckIcon, UserIcon } from './icons';

interface LobbyProps {
    room: Room;
    currentUser: Player;
    onStartQuiz: () => void;
}

const SourceList: React.FC<{ sources: Room['groundingSources'] }> = ({ sources }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!sources || sources.length === 0) {
        return null;
    }

    return (
        <div className="max-w-md mx-auto mb-6 text-left bg-slate-900/50 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 font-semibold text-slate-200">
                <span>Quiz Sources (Verified by AI)</span>
                <svg className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-3 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-3">This quiz was generated using information from the following sources:</p>
                    <ul className="space-y-2">
                        {sources.map((source, index) => (
                            <li key={index}>
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:text-purple-300 hover:underline break-words" title={source.uri}>
                                    {source.title || new URL(source.uri).hostname}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const Lobby: React.FC<LobbyProps> = ({ room, currentUser, onStartQuiz }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(room.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="animate-fade-in text-center">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Quiz Room Lobby</h2>
            <p className="text-slate-400 mb-6">Waiting for players to join before starting the quiz.</p>

            <div className="bg-slate-900/50 p-4 rounded-lg mb-6 max-w-sm mx-auto">
                <p className="text-slate-300 mb-2">Share this Room ID with your friends:</p>
                <div className="flex items-center justify-center bg-slate-700 rounded-lg p-3">
                    <span className="text-2xl font-bold tracking-widest text-purple-400 mr-4">{room.id}</span>
                    <button onClick={handleCopy} className="p-2 rounded-md bg-slate-600 hover:bg-slate-500 transition text-white">
                        {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                </div>
            </div>

            <SourceList sources={room.groundingSources} />

            <div className="max-w-md mx-auto mb-8">
                 <h3 className="text-xl font-semibold mb-4 text-slate-200">Players in Room ({room.players.length})</h3>
                <div className="space-y-3">
                    {room.players.map(player => (
                        <div key={player.id} className="flex items-center bg-slate-700 p-3 rounded-lg shadow">
                            <UserIcon />
                            <span className="ml-3 font-medium text-slate-100">{player.name} {player.id === currentUser.id && "(You)"}</span>
                             {player.isHost && (
                                <span className="ml-auto text-xs font-bold bg-purple-500 text-white px-2 py-1 rounded-full">HOST</span>
                             )}
                        </div>
                    ))}
                </div>
            </div>
            
            {currentUser.isHost && (
                <button 
                    onClick={onStartQuiz} 
                    className="w-full max-w-sm mx-auto bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                    Start Quiz for Everyone
                </button>
            )}
             {!currentUser.isHost && (
                <p className="text-slate-400">Waiting for the host to start the quiz...</p>
            )}
        </div>
    );
};

export default Lobby;
