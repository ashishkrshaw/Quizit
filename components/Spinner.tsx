
import React from 'react';

interface SpinnerProps {
    message: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-800/80 to-slate-900/90 rounded-2xl shadow-2xl">
            <div className="mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg animate-spin-slow flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white opacity-90" />
                </div>
            </div>
            <p className="text-white text-lg font-semibold">{message}</p>
            <p className="text-slate-400 mt-2 text-sm">This may take a moment...</p>
        </div>
    );
};

// slow spin utility inlined to avoid changing tailwind config
const style = document.createElement('style');
style.innerHTML = `@keyframes spin-slow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } } .animate-spin-slow { animation: spin-slow 1.8s linear infinite; }`;
document.head.appendChild(style);

export default Spinner;
