import { GoogleGenAI } from "@google/genai";
import { CurrencyPairData, Timeframe } from '../types';

// Cache simple pour limiter les appels API (Durée: 1 minute)
const analysisCache = new Map<string, { timestamp: number, response: string }>();
const CACHE_DURATION = 60 * 1000;

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// --- LOGIQUE TECHNIQUE LOCALE (MODE SECOURS) ---
// Utilisée quand l'API est saturée (Erreur 429) ou pour le scalping ultra-rapide
const getTechnicalFallbackAnalysis = (pairData: CurrencyPairData): string => {
    const rsiState = pairData.rsi > 70 ? "en surachat (pression vendeuse)" : pairData.rsi < 30 ? "en survente (pression acheteuse)" : "neutre";
    const trend = pairData.change >= 0 ? "haussière" : "baissière";
    return `Mode Relais (Quota IA Atteint): Le flux du marché est actuellement en tendance ${trend}. Le RSI est ${rsiState} (${pairData.rsi.toFixed(1)}). Signal basé sur la structure technique immédiate.`;
};

const getTechnicalDirection = (pairData: CurrencyPairData): 'HAUSSE' | 'BAISSE' => {
    // 1. Priorité aux zones extrêmes (Rebond)
    if (pairData.rsi < 30 && pairData.stochastic < 25) return 'HAUSSE'; // Rebond probable
    if (pairData.rsi > 70 && pairData.stochastic > 75) return 'BAISSE'; // Correction probable

    // 2. Si pas d'extrême, on suit le momentum (Tendance)
    // On regarde si la bougie est verte (change > 0) ou rouge
    if (pairData.change > 0) return 'HAUSSE';
    return 'BAISSE';
};

// --- SERVICES ---

export const analyzeMarketWithGemini = async (
  pairData: CurrencyPairData,
  timeframe: Timeframe
): Promise<string> => {
  const cacheKey = `${pairData.symbol}-${timeframe}`;
  const cached = analysisCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
  }

  const ai = getAIClient();
  // Fallback immédiat si pas d'API Key configurée
  if (!ai) return getTechnicalFallbackAnalysis(pairData);

  const prompt = `
    Analyse de marché boursier pour trading binaire.
    Paire: ${pairData.symbol}
    Prix: ${pairData.currentPrice}
    RSI: ${pairData.rsi.toFixed(2)}
    Trend: ${pairData.change}%
    
    Tâche: Décris la dynamique acheteur/vendeur actuelle en 1 phrase courte et percutante.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { maxOutputTokens: 100 }
    });
    
    const result = response.text || getTechnicalFallbackAnalysis(pairData);
    analysisCache.set(cacheKey, { timestamp: Date.now(), response: result });
    return result;

  } catch (error: any) {
    console.warn("Gemini Analysis Fallback (Quota/Error):", error.message);
    return getTechnicalFallbackAnalysis(pairData);
  }
};

export const predictSignalTime = async (
  pairData: CurrencyPairData,
  timeframe: Timeframe,
  unit: 'minutes' | 'hours' = 'minutes'
): Promise<{ timeEstimate: string; direction: string; reason: string; durationSeconds: number }> => {
  
  // Fallback par défaut
  const fallbackPrediction = { 
      timeEstimate: "Signal Immédiat", 
      direction: getTechnicalDirection(pairData), 
      reason: "Détection technique des flux (Mode Relais). Volatilité favorable détectée.",
      durationSeconds: 0
  };

  const ai = getAIClient();
  if (!ai) return fallbackPrediction;

  const prompt = `
    Agis comme un algorithme de timing boursier.
    Paire: ${pairData.symbol}
    RSI: ${pairData.rsi.toFixed(2)}
    Stoch: ${pairData.stochastic.toFixed(2)}
    
    Tâche: Quand entrer sur le marché ?
    Réponds en JSON:
    {
      "timeEstimate": "ex: 2 min",
      "direction": "HAUSSE ou BAISSE", 
      "reason": "ex: RSI bas",
      "durationSeconds": 120
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return fallbackPrediction;
    return JSON.parse(text);

  } catch (error: any) {
    console.warn("Gemini Prediction Fallback (Quota/Error):", error.message);
    return fallbackPrediction;
  }
};

export const getQuickDirection = async (
  pairData: CurrencyPairData,
  seconds: number
): Promise<'HAUSSE' | 'BAISSE'> => {
  const ai = getAIClient();

  // Si pas de client IA, on utilise directement l'analyse technique
  if (!ai) return getTechnicalDirection(pairData);

  const prompt = `
    Analyse Scalping (${seconds}s).
    Marché: ${pairData.symbol}
    RSI: ${pairData.rsi.toFixed(2)}
    Stoch: ${pairData.stochastic.toFixed(2)}
    Trend: ${pairData.change}%

    RÈGLE:
    - Si RSI < 35 ou Stoch < 25 -> HAUSSE
    - Si RSI > 65 ou Stoch > 75 -> BAISSE
    - Sinon suis la tendance (${pairData.change >= 0 ? 'HAUSSE' : 'BAISSE'}).

    Réponds SEULEMENT par "HAUSSE" ou "BAISSE".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 10,
      }
    });

    const text = response.text?.trim().toUpperCase();
    if (text?.includes('HAUSSE')) return 'HAUSSE';
    if (text?.includes('BAISSE')) return 'BAISSE';
    
    // Si la réponse de l'IA n'est pas claire
    return getTechnicalDirection(pairData);

  } catch (error: any) {
    // C'EST ICI QUE L'ERREUR 429 EST GÉRÉE
    // Au lieu de planter, on retourne l'analyse technique
    console.warn("Gemini QuickDirection Fallback (Quota/Error):", error.message);
    return getTechnicalDirection(pairData);
  }
};