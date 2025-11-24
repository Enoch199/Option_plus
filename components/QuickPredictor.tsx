import React, { useState, useEffect } from 'react';
import { CurrencyPairData } from '../types';
import { getQuickDirection } from '../services/geminiService';
import { Zap, Timer, TrendingUp, TrendingDown, Activity, ChevronDown, Radio, Search } from 'lucide-react';

interface QuickPredictorProps {
  marketData: CurrencyPairData[];
}

const QuickPredictor: React.FC<QuickPredictorProps> = ({ marketData }) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [prediction, setPrediction] = useState<'HAUSSE' | 'BAISSE' | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>('');

  // Initialize selected symbol
  useEffect(() => {
    if (marketData.length > 0 && !selectedSymbol) {
      setSelectedSymbol(marketData[0].symbol);
    }
  }, [marketData, selectedSymbol]);

  const handlePredict = async (seconds: number) => {
    if (loading || !selectedSymbol) return;
    
    const pairData = marketData.find(p => p.symbol === selectedSymbol);
    if (!pairData) return;

    setSelectedDuration(seconds);
    setPrediction(null);
    setLoading(true);

    // Séquence d'analyse simulée pour "laisser le temps d'analyser"
    // Etape 1: Connexion aux flux
    setLoadingText("Connexion flux boursier...");
    
    setTimeout(() => {
        // Etape 2: Analyse des volumes Acheteurs/Vendeurs
        setLoadingText("Analyse volumes Achat/Vente...");
        
        setTimeout(async () => {
            // Etape 3: Calcul final et appel (Service gère le Quota 429 automatiquement)
            try {
                const result = await getQuickDirection(pairData, seconds);
                setPrediction(result);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
                setLoadingText('');
            }
        }, 1500); // Délai partie 2
    }, 1500); // Délai partie 1
  };

  const currentPair = marketData.find(p => p.symbol === selectedSymbol);

  return (
    <div className="bg-slate-800 rounded-xl border border-blue-500/30 shadow-lg p-5 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Zap className="w-32 h-32 text-blue-400" />
      </div>
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
             <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-white leading-none">Flash Prediction</h3>
            <span className="text-xs text-blue-400 font-mono">Analyse des flux Acheteurs/Vendeurs</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 relative z-10">
        
        {/* Pair Selector */}
        <div className="w-full lg:w-auto min-w-[240px]">
          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 block tracking-wider">Paire à analyser</label>
          <div className="relative group">
            <select 
              value={selectedSymbol}
              onChange={(e) => {
                  setSelectedSymbol(e.target.value);
                  setPrediction(null); 
                  setSelectedDuration(0);
              }}
              className="w-full bg-slate-900 border border-slate-700 text-white font-bold rounded-lg py-3 px-4 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer transition-all hover:bg-slate-800"
            >
              {marketData.map(pair => (
                <option key={pair.symbol} value={pair.symbol}>{pair.symbol}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-white transition-colors" />
          </div>
          {currentPair && (
             <div className="flex justify-between items-center mt-2 px-1">
                 <span className={`text-xs font-mono font-bold ${currentPair.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currentPair.change >= 0 ? '▲' : '▼'} {Math.abs(currentPair.change).toFixed(2)}%
                 </span>
                 {/* Affichage informatif uniquement */}
                 <span className="text-[10px] text-slate-500 font-mono">
                    RSI: {currentPair.rsi.toFixed(0)}
                 </span>
             </div>
          )}
        </div>

        {/* Time Buttons */}
        <div className="flex-1 w-full">
            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 block tracking-wider">Lancer l'analyse (Expiration)</label>
            <div className="grid grid-cols-3 gap-3">
                {[3, 5, 15].map(sec => (
                    <button
                        key={sec}
                        onClick={() => handlePredict(sec)}
                        disabled={loading}
                        className={`
                            relative py-3 px-2 rounded-lg font-bold border transition-all overflow-hidden flex flex-col items-center justify-center gap-1
                            ${loading && selectedDuration === sec ? 'bg-slate-800 border-blue-500 text-blue-400' : ''}
                            ${loading && selectedDuration !== sec ? 'bg-slate-800 border-slate-700 text-slate-600 opacity-50 cursor-not-allowed' : ''}
                            ${!loading && prediction === null && selectedDuration !== sec
                                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white hover:bg-slate-800 shadow-sm' 
                                : ''}
                            ${!loading && selectedDuration === sec 
                                ? 'bg-slate-800 border-blue-500 text-blue-400 ring-1 ring-blue-500/50' // Active/Selected state
                                : ''}
                        `}
                    >
                        {loading && selectedDuration === sec && (
                             <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                        )}
                        <Timer className={`w-4 h-4 ${selectedDuration === sec ? 'text-blue-400' : 'text-slate-500'}`} />
                        <span className="text-sm font-mono">{sec}s</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Result Area */}
        <div className="w-full lg:w-[320px] h-[90px] bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center relative overflow-hidden shadow-inner">
            {loading ? (
                <div className="flex flex-col items-center justify-center w-full h-full p-4">
                     <div className="flex items-center gap-3 mb-2">
                        <Search className="w-4 h-4 text-blue-400 animate-bounce" />
                        <span className="text-xs text-blue-300 font-bold font-mono uppercase tracking-wide">{loadingText}</span>
                     </div>
                     <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-progress-indeterminate"></div>
                     </div>
                </div>
            ) : prediction ? (
                <div className="flex items-center gap-4 animate-in zoom-in duration-300 z-10 w-full px-6 justify-between bg-slate-900/50 backdrop-blur-sm h-full">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Signal Détecté</span>
                        <div className={`text-3xl font-black tracking-tighter ${prediction === 'HAUSSE' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]'}`}>
                            {prediction}
                        </div>
                    </div>
                    
                    <div className={`p-3 rounded-full shadow-lg border-2 ${
                        prediction === 'HAUSSE' 
                        ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' 
                        : 'bg-rose-900/20 border-rose-500 text-rose-400'
                    }`}>
                        {prediction === 'HAUSSE' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                    </div>
                </div>
            ) : (
                <div className="text-center text-slate-600 z-10 flex flex-col items-center">
                    <Radio className="w-6 h-6 mb-2 opacity-40" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">En attente de sélection</p>
                </div>
            )}
        </div>

      </div>
      
      <style jsx>{`
        @keyframes progress-indeterminate {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 70%; margin-left: 30%; }
            100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
            animation: progress-indeterminate 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default QuickPredictor;