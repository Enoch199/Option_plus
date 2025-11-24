import React from 'react';
import { Timeframe } from '../types';
import { Clock } from 'lucide-react';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onSelect: (t: Timeframe) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ selected, onSelect }) => {
  const timeframes = Object.values(Timeframe);

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-800 rounded-xl shadow-md border border-slate-700 mb-6">
      <div className="flex items-center gap-2 mr-4 text-slate-400">
        <Clock className="w-5 h-5" />
        <span className="text-sm font-medium">Durée d'expiration:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onSelect(tf)}
            className={`
              px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200
              ${selected === tf 
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}
            `}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeframeSelector;