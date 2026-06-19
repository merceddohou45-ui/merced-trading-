import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { tryAcquireAdvisoryLock, releaseAdvisoryLock } from './locks';
import { refreshBrokerSymbols } from '@/lib/canonicalRegistry';

const DEFAULT_CRON = process.env.REFRESH_CRON || '*/5 * * * *'; // every 5 minutes
const BROKERS = (process.env.BROKERS || 'binance,bybit').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_RETRIES = parseInt(process.env.REFRESH_MAX_RETRIES || '3', 10);
const BACKOFF_BASE_MS = parseInt(process.env.REFRESH_BACKOFF_BASE_MS || '1000', 10);

function logInfo(msg: string, meta: Record<string, any> = {}) {
  console.log(JSON.stringify({ level: 'info', msg, ...meta }));
}
function logError(msg: string, meta: Record<string, any> = {}) {
  console.error(JSON.stringify({ level: 'error', msg, ...meta }));
}

export async function runRefreshForBroker(broker: string) {
  const lockKey = `refresh:${broker}`;
  const acquired = await tryAcquireAdvisoryLock(prisma, lockKey);
  if (!acquired) {
    logInfo('lock_not_acquired', { broker });
    return { broker, acquired: false };
  }
  logInfo('lock_acquired', { broker });

  try {
    let attempt = 0;
    let lastError: any = null;
    while (attempt < MAX_RETRIES) {
      try {
        attempt += 1;
        logInfo('refresh_attempt', { broker, attempt });
        const symbols = await refreshBrokerSymbols(broker);
        logInfo('refresh_success', { broker, fetched: symbols.length });
        return { broker, acquired: true, success: true, fetched: symbols.length };
      } catch (err) {
        lastError = err;
        const wait = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        logError('refresh_error', { broker, attempt, err: String(err), retryInMs: wait });
        await new Promise((res) => setTimeout(res, wait));
      }
    }
    logError('refresh_failed_after_retries', { broker, lastError: String(lastError) });
    return { broker, acquired: true, success: false, error: String(lastError) };
  } finally {
    const released = await releaseAdvisoryLock(prisma, lockKey);
    logInfo('lock_released', { broker, released });
  }
}

export function startScheduler(cronExpr: string = DEFAULT_CRON) {
  logInfo('scheduler_starting', { cron: cronExpr, brokers: BROKERS });
  // schedule single cron that iterates brokers
  cron.schedule(cronExpr, async () => {
    logInfo('scheduler_tick', { cron: cronExpr, ts: new Date().toISOString() });
    for (const b of BROKERS) {
      // run without awaiting to allow parallelism; locks prevent duplicates
      runRefreshForBroker(b).catch((err) => logError('runRefreshForBroker_exception', { broker: b, err: String(err) }));
    }
  });
}

// If this module is executed directly, start the scheduler
if (require.main === module) {
  startScheduler();
}
