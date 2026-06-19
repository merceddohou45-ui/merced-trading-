import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as locks from './locks';
import * as registry from '@/lib/canonicalRegistry';
import { runRefreshForBroker } from './refreshWorker';

describe('refreshWorker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not refresh when lock not acquired', async () => {
    const trySpy = vi.spyOn(locks, 'tryAcquireAdvisoryLock').mockResolvedValue(false);
    const refreshSpy = vi.spyOn(registry, 'refreshBrokerSymbols');
    const res = await runRefreshForBroker('testbroker');
    expect(res.acquired).toBe(false);
    expect(refreshSpy).not.toHaveBeenCalled();
    trySpy.mockRestore();
  });

  it('refreshes when lock acquired and releases lock', async () => {
    const trySpy = vi.spyOn(locks, 'tryAcquireAdvisoryLock').mockResolvedValue(true);
    const releaseSpy = vi.spyOn(locks, 'releaseAdvisoryLock').mockResolvedValue(true);
    const refreshSpy = vi.spyOn(registry, 'refreshBrokerSymbols').mockResolvedValue(['A', 'B']);
    const res = await runRefreshForBroker('testbroker');
    expect(res.acquired).toBe(true);
    expect(res.success).toBe(true);
    expect(res.fetched).toBe(2);
    expect(releaseSpy).toHaveBeenCalled();
    trySpy.mockRestore();
    releaseSpy.mockRestore();
    refreshSpy.mockRestore();
  });

  it('retries on failure and returns failure after retries', async () => {
    const trySpy = vi.spyOn(locks, 'tryAcquireAdvisoryLock').mockResolvedValue(true);
    const releaseSpy = vi.spyOn(locks, 'releaseAdvisoryLock').mockResolvedValue(true);
    const refreshSpy = vi.spyOn(registry, 'refreshBrokerSymbols').mockRejectedValue(new Error('fetch fail'));
    const res = await runRefreshForBroker('testbroker');
    expect(res.acquired).toBe(true);
    expect(res.success).toBe(false);
    expect(res.error).toContain('fetch fail');
    expect(releaseSpy).toHaveBeenCalled();
    trySpy.mockRestore();
    releaseSpy.mockRestore();
    refreshSpy.mockRestore();
  });
});
