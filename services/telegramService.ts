
import { CurrencyPairData } from '../types';

// Token fourni par l'utilisateur pour le bot B_Coin
const BOT_TOKEN = '7932879611:AAFOyQkMXqLdB1cd5_HWD6aIJFbiQCSST1U';

export const sendSignalToTelegram = async (
  chatId: string, 
  data: CurrencyPairData, 
  timeframe: string,
  analysis: string | null
): Promise<boolean> => {
  if (!chatId) return false;

  const directionEmoji = data.signal.includes('ACHAT') || data.signal.includes('BUY')
    ? '🟢' 
    : data.signal.includes('VENTE') || data.signal.includes('SELL')
      ? '🔴' 
      : '⚪';

  // Traduction du signal pour l'affichage
  let signalText = 'NEUTRE';
  if (data.signal.includes('STRONG_BUY') || data.signal === 'ACHAT FORT') signalText = 'ACHAT FORT (STRONG BUY)';
  else if (data.signal.includes('BUY') || data.signal === 'ACHAT') signalText = 'ACHAT (BUY)';
  else if (data.signal.includes('STRONG_SELL') || data.signal === 'VENTE FORTE') signalText = 'VENTE FORTE (STRONG SELL)';
  else if (data.signal.includes('SELL') || data.signal === 'VENTE') signalText = 'VENTE (SELL)';

  const message = `
📊 *SIGNAL POCKET OPTION*

💱 *Paire:* \`${data.symbol}\`
⏱ *Expiration:* ${timeframe}
💵 *Prix:* \`${data.currentPrice.toFixed(data.symbol.includes('JPY') ? 3 : 5)}\`

🎯 *SIGNAL:* ${directionEmoji} *${signalText}*
📈 *RSI:* ${data.rsi.toFixed(1)} | *Stoch:* ${data.stochastic.toFixed(1)}

${analysis ? `🤖 *Analyse IA:* _${analysis}_` : ''}

🚀 _Envoyé via PocketSignal AI_
`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram Error:', errorData);
      alert(`Erreur Telegram: ${errorData.description}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Network Error sending to Telegram:', error);
    alert("Erreur réseau lors de l'envoi à Telegram.");
    return false;
  }
};
