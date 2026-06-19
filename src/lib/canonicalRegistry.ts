import { prisma } from '@/lib/prisma';
import { fetchSymbols } from '@/services/brokers';
import { validateAssetSymbol } from '@/lib/validation';

// DB-backed canonical registry for broker symbols. Uses Prisma for persistence.
// Optional short TTL in-memory cache for reads only (authoritative DB is always used for writes).

const READ_CACHE_TTL_MS = 30000; // 30 seconds
const readCache: Map<string, { ts: number; symbols: string[] }> = new Map();

function invalidateCache(broker: string) {
  readCache.delete(broker.toLowerCase());
}

export async function refreshBrokerSymbols(broker: string, marketType?: string): Promise<string[]> {
  const b = broker.toLowerCase();
  // fetch from broker adapters
  const fetched = await fetchSymbols(broker);
  const validated = fetched.filter((s) => validateAssetSymbol(s));

  // Upsert each validated symbol
  for (const sym of validated) {
    await prisma.brokerSymbol.upsert({
      where: { broker_symbol: { broker: b, symbol: sym } },
      update: { isActive: true, marketType },
      create: { broker: b, symbol: sym, marketType, isActive: true },
    });
  }

  // Mark missing symbols as inactive (soft delete)
  const existing = await prisma.brokerSymbol.findMany({ where: { broker: b }, select: { symbol: true } });
  const existingSet = new Set(existing.map((e) => e.symbol));
  const fetchedSet = new Set(validated);
  const toDeactivate: string[] = [];
  for (const sym of existingSet) {
    if (!fetchedSet.has(sym)) toDeactivate.push(sym);
  }
  if (toDeactivate.length > 0) {
    await prisma.brokerSymbol.updateMany({ where: { broker: b, symbol: { in: toDeactivate } }, data: { isActive: false } });
  }

  // invalidate cache and return active symbols
  invalidateCache(b);
  return getBrokerSymbols(b);
}

export async function updateBrokerSymbols(broker: string, symbols: string[], marketType?: string): Promise<string[]> {
  const b = broker.toLowerCase();
  const validated = (symbols || []).filter((s) => validateAssetSymbol(s));
  for (const sym of validated) {
    await prisma.brokerSymbol.upsert({
      where: { broker_symbol: { broker: b, symbol: sym } },
      update: { isActive: true, marketType },
      create: { broker: b, symbol: sym, marketType, isActive: true },
    });
  }
  // mark others inactive
  const existing = await prisma.brokerSymbol.findMany({ where: { broker: b }, select: { symbol: true } });
  const existingSet = new Set(existing.map((e) => e.symbol));
  const validatedSet = new Set(validated);
  const toDeactivate: string[] = [];
  for (const sym of existingSet) if (!validatedSet.has(sym)) toDeactivate.push(sym);
  if (toDeactivate.length > 0) {
    await prisma.brokerSymbol.updateMany({ where: { broker: b, symbol: { in: toDeactivate } }, data: { isActive: false } });
  }
  invalidateCache(b);
  return getBrokerSymbols(b);
}

export async function getBrokerSymbols(broker: string): Promise<string[]> {
  const b = broker.toLowerCase();
  const cached = readCache.get(b);
  const now = Date.now();
  if (cached && now - cached.ts < READ_CACHE_TTL_MS) return cached.symbols;
  const rows = await prisma.brokerSymbol.findMany({ where: { broker: b, isActive: true }, orderBy: { symbol: 'asc' }, select: { symbol: true } });
  const symbols = rows.map((r) => r.symbol);
  readCache.set(b, { ts: Date.now(), symbols });
  return symbols;
}

export async function isCanonical(broker: string, symbol: string): Promise<boolean> {
  const b = broker.toLowerCase();
  const row = await prisma.brokerSymbol.findUnique({ where: { broker_symbol: { broker: b, symbol } }, select: { isActive: true } });
  return !!row;
}
