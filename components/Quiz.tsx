import React, { useState, useEffect, useCallback } from 'react';
import { QuizType, TimerType } from '../types';
import type { Room, Player, ChatMessage } from '../types';
import { SendIcon } from './icons';
import { onNewChatMessage, offNewChatMessage, sendChatMessage } from '../services/socketService';

interface QuizProps {
    room: Room;
    user: Player;
    onQuizEnd: (answers: (string | null)[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ room, user, onQuizEnd }) => {
    const [myAnswers, setMyAnswers] = useState<(string | null)[]>(new Array(room.quiz.length).fill(null));
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(room.quizSettings.timerDuration);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const isMCQ = room.quizType === QuizType.MCQ;
    const currentQuestion = room.quiz[currentQIndex];
    const isPerQuestionTimer = room.quizSettings.timerType === TimerType.PerQuestion;
    const isLastQuestion = currentQIndex === room.quiz.length - 1;

    const handleSubmit = useCallback(() => {
        onQuizEnd(myAnswers);
    }, [myAnswers, onQuizEnd]);

    useEffect(() => {
        if (room.quizSettings.timerType === TimerType.None) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (room.quizSettings.timerType === TimerType.TotalQuiz) {
                        handleSubmit();
                    } else if (isPerQuestionTimer) {
                        if (!isLastQuestion) {
                            setCurrentQIndex(q => q + 1);
                            setTimeLeft(room.quizSettings.timerDuration); 
                        } else {
                            handleSubmit();
                        }
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [room.quizSettings.timerType, room.quizSettings.timerDuration, handleSubmit, currentQIndex, room.quiz.length, isPerQuestionTimer, isLastQuestion]);
    
    useEffect(() => {
        const handleNewMessage = (newMessage: ChatMessage) => {
            setMessages(prev => [...prev, newMessage]);
        };
        onNewChatMessage(handleNewMessage);

        return () => {
            offNewChatMessage(handleNewMessage);
        };
    }, []);


    const handleAnswerSelect = (answer: string) => {
        const newAnswers = [...myAnswers];
        newAnswers[currentQIndex] = answer;
        setMyAnswers(newAnswers);
        // If using per-question timer, reset the timer on manual selection so the user
        // gets a fresh interval to review the question after choosing.
        if (isPerQuestionTimer) {
            setTimeLeft(room.quizSettings.timerDuration);
        }
    };

    const handleSendMessage = (text: string) => {
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: user.name,
            senderId: user.id,
            text,
            score: room.players.find(p => p.id === user.id)?.score ?? 0,
        };
        sendChatMessage(room.id, newMessage);
    };

    // Client-side sanitization as a second line of defense in case the
    // backend left any stray formatting characters.
    const sanitizeString = (s: any) => {
        if (typeof s !== 'string') return s;
        let out = s.trim();
        out = out.replace(/<[^>]*>/g, '');
        out = out.replace(/\*\*|\*|__|_/g, '');
        out = out.replace(/\s+/g, ' ');
        return out;
    };

    const sanitizedOptions: string[] = (currentQuestion.options || []).map((o: string) => sanitizeString(o));

    const getTimerDisplay = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };
    
    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-bold">Question {currentQIndex + 1} / {room.quiz.length}</div>
                    {room.quizSettings.timerType !== TimerType.None && (
                        <div className="text-2xl font-bold bg-slate-700 px-4 py-2 rounded-lg text-purple-400">
                           {getTimerDisplay()}
                        </div>
                    )}
                </div>
                
                <div className="bg-slate-900/50 p-6 rounded-lg mb-6 min-h-[120px]">
                    <p className="text-xl md:text-2xl font-semibold leading-relaxed">{currentQuestion.questionText}</p>
                </div>
                
                <div className={`grid ${isMCQ ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {isMCQ && sanitizedOptions.map((option, index) => (
                         <button 
                             key={index}
                             onClick={() => handleAnswerSelect(option)}
                             className={`p-4 rounded-lg text-left font-medium transition-colors duration-200 text-lg ${myAnswers[currentQIndex] === option ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                         >
                            {option}
                        </button>
                    ))}
                    {!isMCQ && (
                        <textarea
                            rows={4}
                            placeholder="Type your answer here..."
                            value={myAnswers[currentQIndex] || ''}
                            onChange={(e) => handleAnswerSelect(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    )}
                </div>
                
                <div className={`mt-8 flex justify-between items-center`}>
                    <button onClick={() => { setCurrentQIndex(i => Math.max(0, i - 1)); if (isPerQuestionTimer) setTimeLeft(room.quizSettings.timerDuration); }} disabled={currentQIndex === 0} className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-500 disabled:opacity-50 transition">
                        Previous
                    </button>

                    <button onClick={handleSubmit} className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-lg text-xl hover:opacity-90 transition">
                        Finish Quiz
                    </button>

                    <button onClick={() => { setCurrentQIndex(i => Math.min(room.quiz.length - 1, i + 1)); if (isPerQuestionTimer) setTimeLeft(room.quizSettings.timerDuration); }} disabled={isLastQuestion} className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-500 disabled:opacity-50 transition">
                        Next
                    </button>
                </div>
            </div>
            
            <div className="lg:col-span-1 flex flex-col gap-6">
                <div>
                     <h3 className="text-xl font-bold mb-3">Scoreboard</h3>
                     <div className="space-y-2">
                        {room.players.sort((a,b) => b.score - a.score).map(p => (
                             <div key={p.id} className="flex justify-between items-center bg-slate-700/80 p-3 rounded-md">
                                <div className="flex items-center gap-2">
                                    <span className={`font-medium ${p.id === user.id ? 'text-purple-400' : ''}`}>{p.name}</span>
                                </div>
                                <span className="font-bold text-lg">{p.score}</span>
                            </div>
                        ))}
                     </div>
                </div>
                <ChatBox messages={messages} onSendMessage={handleSendMessage} currentUser={user} />
            </div>
        </div>
    );
};

interface ChatBoxProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    currentUser: Player;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, currentUser }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <div className="bg-slate-900/50 rounded-lg p-4 flex flex-col h-[400px]">
            <h3 className="text-xl font-bold mb-3 border-b border-slate-700 pb-2">Discussion</h3>
            <div className="flex-grow overflow-y-auto mb-3 pr-2 space-y-3">
                {messages.map(msg => {
                    const isCurrentUser = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                            <div className={`px-3 py-2 rounded-lg max-w-[80%] ${isCurrentUser ? 'bg-purple-600' : 'bg-slate-700'}`}>
                               <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs text-slate-300 font-bold">{msg.sender}</p>
                                    <span className="bg-slate-800/50 text-purple-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">{msg.score} pts</span>
                               </div>
                               <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow px-3 py-2 bg-slate-700 border-2 border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button type="submit" className="p-3 bg-purple-600 rounded-lg hover:bg-purple-500 transition">
                   <SendIcon />
                </button>
            </form>
        </div>
    );
};


export default Quiz;