export enum Timeframe {
  S3 = '3s',
  S5 = '5s',
  S15 = '15s',
  S30 = '30s',
  M1 = '1M',
  H1 = '1H'
}

export enum SignalType {
  STRONG_BUY = 'ACHAT FORT',
  BUY = 'ACHAT',
  NEUTRAL = 'NEUTRE',
  SELL = 'VENTE',
  STRONG_SELL = 'VENTE FORTE'
}

export interface PricePoint {
  timestamp: number;
  value: number;
}

export interface CurrencyPairData {
  symbol: string; // e.g., EUR/USD
  currentPrice: number;
  history: PricePoint[];
  change: number; // Percentage change
  rsi: number; // Simulated RSI
  stochastic: number; // Simulated Stochastic
  signal: SignalType;
  winRate: number; // Probability of success percentage
  lastUpdated: number;
}

export interface AIAnalysisResult {
  symbol: string;
  analysis: string;
  confidence: number;
}