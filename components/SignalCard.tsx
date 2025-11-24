import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, YAxis, XAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { CurrencyPairData, SignalType, Timeframe } from '../types';
import { Minus, Sparkles, ArrowRight, ArrowUpCircle, ArrowDownCircle, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw, Target, Gauge, Radar, Timer, TrendingUp, Clock, Hourglass } from 'lucide-react';
import { analyzeMarketWithGemini, predictSignalTime } from '../services/geminiService';

interface SignalCardProps {
  data: CurrencyPairData;
  timeframe: Timeframe;
}

const SignalCard: React.FC<SignalCardProps> = ({ data, timeframe }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // Overlay States
  const [overlayMode, setOverlayMode] = useState<'none' | 'signal' | 'radar'>('none');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Radar Prediction State
  const [predictionUnit, setPredictionUnit] = useState<'minutes' | 'hours'>('minutes');
  const [prediction, setPrediction] = useState<{ timeEstimate: string; direction: string; reason: string; durationSeconds: number } | null>(null);
  const [absoluteTime, setAbsoluteTime] = useState<string | null>(null);

  // Zoom and Pan State
  const [viewSize, setViewSize] = useState(20);
  const [viewOffset, setViewOffset] = useState(0);

  // Automatic AI Analysis Trigger for Signal View
  useEffect(() => {
    let isMounted = true;
    if (data.signal === SignalType.NEUTRAL) {
      setAiAnalysis(null);
    } else {
       const performAnalysis = async () => {
           if (isLoadingAI) return;
           setIsLoadingAI(true);
           setAiAnalysis(null);
           try {
               const result = await analyzeMarketWithGemini(data, timeframe);
               if (isMounted) setAiAnalysis(result);
           } catch (error) {
               console.error("Auto analysis error", error);
           } finally {
               if (isMounted) setIsLoadingAI(false);
           }
       };
       performAnalysis();
    }
    return () => { isMounted = false; };
  }, [data.signal]);

  // Derived visible data
  const visibleData = useMemo(() => {
    const totalPoints = data.history.length;
    const endIndex = totalPoints - viewOffset;
    const startIndex = Math.max(0, endIndex - viewSize);
    return data.history.slice(startIndex, endIndex);
  }, [data.history, viewSize, viewOffset]);

  // Handlers
  const handleZoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setViewSize(prev => Math.max(5, prev - 5)); };
  const handleZoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setViewSize(prev => Math.min(data.history.length, prev + 5)); };
  const handlePanLeft = (e: React.MouseEvent) => { e.stopPropagation(); setViewOffset(prev => Math.min(data.history.length - viewSize, prev + 5)); };
  const handlePanRight = (e: React.MouseEvent) => { e.stopPropagation(); setViewOffset(prev => Math.max(0, prev - 5)); };
  const handleResetView = (e: React.MouseEvent) => { e.stopPropagation(); setViewOffset(0); setViewSize(20); };

  const openSignalOverlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOverlayMode('signal');
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 800);
  };

  const fetchPrediction = async (unit: 'minutes' | 'hours') => {
    setIsAnalyzing(true);
    setPrediction(null);
    setAbsoluteTime(null);
    try {
        const result = await predictSignalTime(data, timeframe, unit);
        setPrediction(result);
        
        // Calculate absolute time
        if (result.durationSeconds > 0) {
            const now = new Date();
            const futureTime = new Date(now.getTime() + result.durationSeconds * 1000);
            const hours = futureTime.getHours().toString();
            const mins = futureTime.getMinutes().toString().padStart(2, '0');
            const secs = futureTime.getSeconds().toString().padStart(2, '0');
            // Format: 15h39min10s
            const timeString = `${hours}h${mins}min${secs}s`;
            setAbsoluteTime(timeString);
        } else {
            setAbsoluteTime(null);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const openRadarOverlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOverlayMode('radar');
    // Default to minutes when opening
    setPredictionUnit('minutes');
    fetchPrediction('minutes');
  };

  const handleUnitChange = (unit: 'minutes' | 'hours') => {
      if (unit === predictionUnit) return;
      setPredictionUnit(unit);
      fetchPrediction(unit);
  };

  const closeOverlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOverlayMode('none');
  };

  // Visual Helpers
  const isPositive = data.change >= 0;
  const chartColor = isPositive ? '#10b981' : '#f43f5e';
  const isBullish = data.signal === SignalType.STRONG_BUY || data.signal === SignalType.BUY;
  const isBearish = data.signal === SignalType.STRONG_SELL || data.signal === SignalType.SELL;

  const getWinRateColor = (rate: number) => {
      if (rate >= 85) return 'text-emerald-400';
      if (rate >= 70) return 'text-blue-400';
      return 'text-yellow-400';
  };

  const getProgressBarColor = (rate: number) => {
      if (rate >= 85) return 'bg-emerald-500';
      if (rate >= 70) return 'bg-blue-500';
      return 'bg-yellow-500';
  }

  const getRsiColor = (val: number) => {
      if (val > 70) return 'text-rose-400';
      if (val < 30) return 'text-emerald-400';
      return 'text-slate-300';
  }

  const getStochColor = (val: number) => {
      if (val > 80) return 'text-rose-400';
      if (val < 20) return 'text-emerald-400';
      return 'text-slate-300';
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };
  
  const isJpy = data.symbol.includes('JPY');
  const formatPrice = (val: number) => val.toFixed(isJpy ? 2 : 5);
  const formatPriceAxis = (val: number) => val.toFixed(isJpy ? 2 : 4);

  const CustomLiveDot = (props: any) => {
    const { cx, cy, index, payload } = props;
    const isLastVisiblePoint = index === visibleData.length - 1;
    const isActuallyLive = viewOffset === 0;

    if (isLastVisiblePoint && isActuallyLive) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={6} fill={chartColor} opacity={0.4}>
                    <animate attributeName="r" from="6" to="20" dur="1.5s" begin="0s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r={4} stroke="#fff" strokeWidth={2} fill={chartColor} />
            </g>
        );
    }
    return null;
  };

  return (
    <div 
        className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg hover:shadow-2xl hover:border-blue-500/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group h-[350px]"
    >
      {/* Main Overlay (Handles both Signal and Radar views) */}
      {overlayMode !== 'none' && (
        <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 h-full">
            <button 
                onClick={closeOverlay}
                className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-40"
            >
                <X className="w-5 h-5" />
            </button>

            {isAnalyzing ? (
                <div className="flex flex-col items-center gap-4 mt-8">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        {overlayMode === 'radar' && <Radar className="absolute inset-0 m-auto w-6 h-6 text-blue-400 animate-pulse" />}
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">
                            {overlayMode === 'radar' ? 'Analyse du Marché...' : 'Analyse du Signal...'}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">Calcul des probabilités en temps réel</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 w-full absolute inset-0 justify-start bg-slate-900 overflow-y-auto p-4">
                    
                    {/* === VIEW: SIGNAL DETAIL === */}
                    {overlayMode === 'signal' && (
                        <>
                            <div className="bg-slate-800 px-3 py-0.5 rounded-full border border-slate-700 mb-2 mt-8">
                                <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Signal ({timeframe})</h3>
                            </div>
                            
                            {isBullish && (
                                <div className="animate-in zoom-in duration-300 flex flex-col items-center mb-4">
                                    <ArrowUpCircle className="w-14 h-14 text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-1" />
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-400 tracking-tight">HAUSSE</span>
                                </div>
                            )}

                            {isBearish && (
                                <div className="animate-in zoom-in duration-300 flex flex-col items-center mb-4">
                                    <ArrowDownCircle className="w-14 h-14 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.4)] mb-1" />
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-rose-400 tracking-tight">BAISSE</span>
                                </div>
                            )}

                            {!isBullish && !isBearish && (
                                <div className="animate-in zoom-in duration-300 flex flex-col items-center mb-4">
                                    <Minus className="w-14 h-14 text-slate-500 mb-1" />
                                    <span className="text-2xl font-bold text-slate-400">NEUTRE</span>
                                </div>
                            )}

                            {/* Indicateurs Techniques */}
                            <div className="grid grid-cols-2 gap-3 w-full mb-2">
                                <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex flex-col items-center">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold mb-1">RSI (14)</span>
                                    <span className={`text-lg font-mono font-bold ${getRsiColor(data.rsi)}`}>{data.rsi.toFixed(1)}</span>
                                </div>
                                <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex flex-col items-center">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold mb-1">Stoch</span>
                                    <span className={`text-lg font-mono font-bold ${getStochColor(data.stochastic)}`}>{data.stochastic.toFixed(1)}</span>
                                </div>
                            </div>

                            {/* Confiance */}
                            <div className="w-full bg-slate-800/30 p-3 rounded-lg border border-slate-700 mb-3">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                        <Target className="w-3 h-3 text-blue-400" /> Confiance IA
                                    </span>
                                    <span className={`text-sm font-black ${getWinRateColor(data.winRate)}`}>{data.winRate}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressBarColor(data.winRate)}`} style={{ width: `${data.winRate}%` }}></div>
                                </div>
                            </div>

                            {/* Analyse Texte */}
                            <div className="w-full pb-4">
                                {isLoadingAI ? (
                                    <div className="flex items-center justify-center gap-2 text-xs text-blue-300 animate-pulse p-3 bg-blue-900/20 rounded border border-blue-800/30">
                                        <Sparkles className="w-3 h-3" /> <span>Analyse Gemini en cours...</span>
                                    </div>
                                ) : aiAnalysis ? (
                                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600/50 shadow-inner text-left animate-in slide-in-from-bottom-3">
                                        <div className="flex items-center gap-1.5 mb-2 text-blue-400 font-bold text-[11px] uppercase border-b border-slate-700 pb-1">
                                            <Sparkles className="w-3 h-3" /> Analyse Gemini 2.5 Flash
                                        </div>
                                        <p className="text-xs text-slate-200 leading-relaxed font-medium">"{aiAnalysis}"</p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-slate-800/50 rounded text-xs text-slate-500 italic border border-slate-700/50">En attente...</div>
                                )}
                            </div>
                        </>
                    )}

                    {/* === VIEW: RADAR PREDICTION === */}
                    {overlayMode === 'radar' && prediction && (
                        <>
                             <div className="bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/50 mb-2 mt-8 animate-in slide-in-from-top-4">
                                <h3 className="text-blue-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Radar className="w-3 h-3 animate-pulse" /> Scanner Temps Réel
                                </h3>
                            </div>

                            {/* Unit Selector */}
                            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 mb-4 shadow-sm w-full max-w-[200px]">
                                <button 
                                    onClick={() => handleUnitChange('minutes')}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${predictionUnit === 'minutes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                >
                                    Minutes
                                </button>
                                <button 
                                    onClick={() => handleUnitChange('hours')}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${predictionUnit === 'hours' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                >
                                    Heures
                                </button>
                            </div>

                            <div className="w-full bg-slate-800 p-5 rounded-2xl border border-slate-600 shadow-2xl flex flex-col items-center mb-4 animate-in zoom-in duration-300">
                                <span className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-1">
                                    <Hourglass className="w-3 h-3 text-blue-400" /> Entrée optimale dans :
                                </span>
                                
                                <div className="flex flex-col items-center mb-2">
                                    <span className="text-3xl font-black text-white tracking-tighter drop-shadow-lg">
                                        {prediction.timeEstimate}
                                    </span>
                                    {absoluteTime && (
                                        <span className="text-sm font-mono text-slate-400 font-bold mt-1">
                                            ({absoluteTime})
                                        </span>
                                    )}
                                </div>

                                {/* Direction Display based on Analysis */}
                                <div className={`mt-3 flex flex-col items-center justify-center w-full py-2 rounded-lg border ${
                                    prediction.direction.toUpperCase().includes('HAUSSE') 
                                    ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' 
                                    : prediction.direction.toUpperCase().includes('BAISSE') 
                                      ? 'bg-rose-900/30 border-rose-500/50 text-rose-400' 
                                      : 'bg-slate-700 border-slate-600 text-slate-300'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {prediction.direction.toUpperCase().includes('HAUSSE') ? (
                                            <ArrowUpCircle className="w-5 h-5" />
                                        ) : prediction.direction.toUpperCase().includes('BAISSE') ? (
                                            <ArrowDownCircle className="w-5 h-5" />
                                        ) : (
                                            <Minus className="w-5 h-5" />
                                        )}
                                        <span className="text-lg font-black tracking-wide uppercase">
                                            {prediction.direction}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full text-left bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Analyse Technique
                                </div>
                                <p className="text-sm text-slate-300 leading-snug font-medium">"{prediction.reason}"</p>
                            </div>
                            
                            <div className="mt-6 w-full">
                                <button onClick={closeOverlay} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors border border-slate-600">
                                    Fermer le Scanner
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
      )}

      {/* Header (Symbol + Change + Price) */}
      <div className="flex justify-between items-start p-4 relative z-10 h-[80px]">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border bg-slate-700/50 border-slate-600 shadow-md`}>
                <span className={`font-bold text-xs text-slate-200`}>{data.symbol.substring(0, 3)}</span>
            </div>
            <div>
                <h3 className="font-bold text-white text-base leading-none shadow-black drop-shadow-sm">{data.symbol}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700/50 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-900/80 ${data.winRate > 80 ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-slate-700'}`}>
                        {data.winRate}%
                    </span>
                </div>
            </div>
        </div>
        <div className="flex flex-col items-end">
             <span className={`text-xl font-mono font-bold tracking-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPrice(data.currentPrice)}</span>
             <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Prix Actuel</span>
        </div>
      </div>

      {/* Chart Controls Toolbar */}
      <div className="absolute top-[80px] left-4 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700 p-1 shadow-sm">
            <button onClick={handlePanLeft} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><ChevronLeft className="w-3 h-3" /></button>
            <button onClick={handleResetView} className={`p-1 hover:bg-slate-700 rounded ${viewOffset === 0 ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}><RotateCcw className="w-3 h-3" /></button>
            <button onClick={handlePanRight} disabled={viewOffset === 0} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-3 h-3" /></button>
            <div className="w-[1px] bg-slate-700 mx-1"></div>
            <button onClick={handleZoomOut} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><ZoomOut className="w-3 h-3" /></button>
            <button onClick={handleZoomIn} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><ZoomIn className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="absolute bottom-0 left-0 right-0 top-[70px] z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visibleData} margin={{ top: 40, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${data.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
            <XAxis dataKey="timestamp" tickFormatter={formatTime} tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#334155' }} minTickGap={30} height={20} dy={5} />
            <YAxis domain={['dataMin', 'dataMax']} orientation="right" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={formatPriceAxis} tickLine={false} axisLine={false} width={45} interval="preserveStartEnd" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} labelStyle={{ color: '#94a3b8', fontSize: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} formatter={(value: number) => [formatPrice(value), 'Prix']} labelFormatter={(label: number) => formatTime(label)} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="value" stroke={chartColor} fillOpacity={1} fill={`url(#color${data.symbol})`} strokeWidth={2} isAnimationActive={false} dot={<CustomLiveDot />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Actions Bar (Signal & Radar) */}
       <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-2">
           {/* Voir Signal Button */}
           <button 
                onClick={openSignalOverlay}
                className="flex-1 flex items-center justify-center gap-1 text-white text-[10px] font-bold bg-blue-600/90 py-2 rounded-lg shadow-lg backdrop-blur hover:bg-blue-500 border border-blue-400/30 hover:scale-[1.02] transition-transform"
           >
                Voir Signal <ArrowRight className="w-3 h-3" />
           </button>
           
           {/* Radar Prediction Button */}
           <button
                onClick={openRadarOverlay}
                className="flex items-center justify-center w-10 h-[34px] bg-slate-800/90 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/20 hover:scale-110 transition-all shadow-lg backdrop-blur"
                title="Prédire le temps (Radar)"
           >
               <Radar className="w-4 h-4" />
           </button>
      </div>
    </div>
  );
};

export default SignalCard;