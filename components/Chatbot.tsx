import React, { useState } from 'react';
import * as api from '../services/apiService';

interface ChatbotProps {
    currentUserName?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ currentUserName }) => {
    const [messages, setMessages] = useState<{ from: 'user' | 'bot'; text: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const text = input.trim();
        setMessages(prev => [...prev, { from: 'user', text }]);
        setInput('');
        setLoading(true);
        try {
            const res = await api.chatAssistant(text);
            setMessages(prev => [...prev, { from: 'bot', text: res.reply || 'Sorry, I could not generate a reply.' }]);
        } catch (err) {
            setMessages(prev => [...prev, { from: 'bot', text: 'Assistant unavailable. Try again later.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/60 rounded-lg p-4">
            <h4 className="text-lg font-bold mb-3">Quiz Assistant {currentUserName ? `for ${currentUserName}` : ''}</h4>
            <div className="h-48 overflow-y-auto mb-3 space-y-2 p-2 border border-slate-800 rounded">
                {messages.map((m, i) => (
                    <div key={i} className={`p-2 rounded ${m.from === 'user' ? 'bg-slate-700 text-white self-end' : 'bg-purple-700 text-white'}`}>
                        <div className="text-sm">{m.text}</div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the assistant..." className="flex-grow px-3 py-2 bg-slate-800 rounded"/>
                <button onClick={sendMessage} disabled={loading} className="px-3 py-2 bg-purple-600 rounded text-white">{loading ? '...' : 'Send'}</button>
            </div>
        </div>
    );
};

export default Chatbot;