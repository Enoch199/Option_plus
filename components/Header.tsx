import React from 'react';
import { Activity, Cpu } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between shadow-lg relative">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">PocketSignal <span className="text-blue-400">AI</span></h1>
          <p className="text-xs text-slate-400">Assistant de Trading Options Binaires</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300">
            Moteur: Gemini 2.5
            </span>
        </div>
      </div>
    </header>
  );
};

export default Header;