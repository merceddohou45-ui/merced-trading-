import fetch from 'node-fetch';

export async function fetchBybitSymbols(): Promise<string[]> {
  // Bybit public symbols endpoint (spot)
  const url = 'https://api.bybit.com/spot/v1/symbols';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bybit fetch error: ${res.status}`);
  const data = await res.json();
  if (!data.result || !Array.isArray(data.result)) return [];
  return data.result.map((s: any) => String(s.name || s.symbol).toUpperCase()).filter(Boolean);
}
