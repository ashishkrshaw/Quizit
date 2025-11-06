import React from 'react';
import Spinner from './Spinner';

interface InsightsProps {
    isLoading: boolean;
    insightText: string;
    onBack: () => void;
}

// A simple function to render markdown-like text to HTML
const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
        if (line.startsWith('### ')) {
            return <h3 key={index} className="text-xl font-bold mt-4 mb-2 text-purple-300">{line.substring(4)}</h3>;
        }
        if (line.startsWith('## ')) {
            return <h2 key={index} className="text-2xl font-bold mt-6 mb-3 text-purple-300">{line.substring(3)}</h2>;
        }
        if (line.startsWith('# ')) {
            return <h1 key={index} className="text-3xl font-extrabold mt-4 mb-2">{line.substring(2)}</h1>;
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
            return <li key={index} className="ml-6 list-disc">{line.substring(2)}</li>;
        }
        if (line.trim() === '') {
            return <br key={index} />;
        }
        return <p key={index} className="mb-2 text-slate-300">{line}</p>;
    });
};

const Insights: React.FC<InsightsProps> = ({ isLoading, insightText, onBack }) => {
    if (isLoading) {
        return <Spinner message="Your personal AI coach is analyzing your performance..." />;
    }

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-center text-slate-100 mb-6">Your Daily Insights</h2>
            
            <div className="bg-slate-900/50 p-6 rounded-lg prose prose-invert">
                 {renderMarkdown(insightText)}
            </div>

            <button
                onClick={onBack}
                className="w-full max-w-sm mx-auto mt-8 bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-500 transition-colors"
            >
                Back to Home
            </button>
        </div>
    );
};

export default Insights;
