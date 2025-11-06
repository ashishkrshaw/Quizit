
import React from 'react';

interface SpinnerProps {
    message: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
            <p className="text-white text-lg font-semibold">{message}</p>
            <p className="text-slate-400 mt-2">This may take a moment...</p>
        </div>
    );
};

export default Spinner;
