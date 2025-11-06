import React, { useState } from 'react';
import type { Room } from '../types';
import { CrownIcon } from './icons';

interface ResultsProps {
    room: Room;
    onPlayAgain: () => void;
    currentUserId: string;
}

const SourceList: React.FC<{ sources: Room['groundingSources'] }> = ({ sources }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!sources || sources.length === 0) {
        return null;
    }

    return (
        <div className="max-w-lg mx-auto mb-8 text-left bg-slate-700/50 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 font-semibold text-slate-200">
                <span>View Quiz Sources</span>
                <svg className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-3 border-t border-slate-600">
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

const ReviewAnswers: React.FC<{ room: Room; currentUserId: string }> = ({ room, currentUserId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentUser = room.players.find(p => p.id === currentUserId);

    if (!currentUser) return null;

    return (
         <div className="max-w-lg mx-auto mb-8 text-left bg-slate-700/50 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 font-semibold text-slate-200">
                <span>Review Your Answers</span>
                <svg className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-600 space-y-4">
                    {room.quiz.map((q, index) => {
                        const userAnswer = currentUser.answers[index];
                        const isCorrect = userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
                        return (
                            <div key={index} className="bg-slate-800 p-3 rounded-md">
                                <p className="font-semibold text-slate-300">Q{index+1}: {q.questionText}</p>
                                <p className={`mt-2 text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    Your Answer: <span className="font-mono p-1 rounded bg-slate-700">{userAnswer || 'No answer'}</span>
                                </p>
                                {!isCorrect && (
                                     <p className="mt-1 text-sm text-green-400">
                                        Correct Answer: <span className="font-mono p-1 rounded bg-slate-700">{q.correctAnswer}</span>
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const Results: React.FC<ResultsProps> = ({ room, onPlayAgain, currentUserId }) => {
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const getFormattedQuiz = () => {
        let text = `Quiz Topic: ${room.quizSettings.topic}\n\n`;
        text += '--- Questions and Answers ---\n\n';
        room.quiz.forEach((q, index) => {
            text += `Q${index + 1}: ${q.questionText}\n`;
            text += `Answer: ${q.correctAnswer}\n\n`;
        });
        return text;
    };

    const handleCopyToClipboard = () => {
        const quizText = getFormattedQuiz();
        navigator.clipboard.writeText(quizText);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };

    const handleDownload = () => {
        const quizText = getFormattedQuiz();
        const blob = new Blob([quizText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz_${room.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-fade-in text-center">
            <h2 className="text-3xl font-extrabold text-slate-100 mb-4">Quiz Finished!</h2>
            
            {winner && (
                 <div className="bg-slate-700/50 p-6 rounded-xl border-2 border-yellow-400 mb-8 max-w-md mx-auto">
                    <div className="flex items-center justify-center mb-2">
                        <CrownIcon />
                        <h3 className="text-2xl font-bold text-yellow-300 ml-2">Winner</h3>
                    </div>
                    <p className="text-3xl font-bold">{winner.name}</p>
                    <p className="text-xl text-slate-300">Final Score: {winner.score}</p>
                </div>
            )}

            <h3 className="text-2xl font-bold mb-4">Final Leaderboard</h3>
            <div className="space-y-3 max-w-lg mx-auto mb-8">
                {sortedPlayers.map((player, index) => (
                    <div key={player.id} className="flex items-center bg-slate-700 p-4 rounded-lg shadow-lg">
                        <span className="text-2xl font-bold w-10">{index + 1}</span>
                        <span className="text-lg font-medium flex-grow text-left">{player.name}</span>
                        <span className="text-xl font-bold text-purple-400">{player.score} pts</span>
                    </div>
                ))}
            </div>

            <ReviewAnswers room={room} currentUserId={currentUserId} />
            <SourceList sources={room.groundingSources} />
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto mb-8">
                <button onClick={handleCopyToClipboard} className="w-full bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-500 transition-colors">
                    {copyStatus === 'copied' ? 'Copied!' : 'Copy Q&A'}
                </button>
                <button onClick={handleDownload} className="w-full bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-500 transition-colors">
                    Download .txt
                </button>
            </div>


            <button
                onClick={onPlayAgain}
                className="w-full max-w-sm mx-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
            >
                Create a New Room
            </button>
        </div>
    );
};

export default Results;