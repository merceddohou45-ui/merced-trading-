import fetch from 'node-fetch';

export async function fetchBinanceSymbols(): Promise<string[]> {
  // Binance ExchangeInfo endpoint
  const url = 'https://api.binance.com/api/v3/exchangeInfo';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`binance fetch error: ${res.status}`);
  const data = await res.json();
  if (!data.symbols) return [];
  return data.symbols.map((s: any) => String(s.symbol).toUpperCase()).filter(Boolean);
}
