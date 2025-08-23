import React from 'react';
import { useTTS } from '../contexts/TTSContext';

export const ProgressBar = () => {
    const { loading, progress } = useTTS();

    // Only show if loading or has progress
    if (!progress.message && progress.value === 0) {
        return null;
    }

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
            <div className="flex justify-between items-center text-sm text-slate-300 mb-3">
                <span>{progress.message}</span>
                <span>{progress.value}%</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-cyan-400 to-purple-400 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress.value}%` }}
                />
            </div>
        </div>
    );
};