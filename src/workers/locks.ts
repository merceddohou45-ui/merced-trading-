import { PrismaClient } from '@prisma/client';

export async function tryAcquireAdvisoryLock(prisma: PrismaClient, key: string): Promise<boolean> {
  // Compute a deterministic 64-bit hash from the key using FNV-1a 64-bit
  function fnv1a64(str: string): bigint {
    let h = 1469598103934665603n;
    const prime = 1099511628211n;
    for (let i = 0; i < str.length; i++) {
      h ^= BigInt(str.charCodeAt(i));
      h *= prime;
    }
    // keep as signed 64-bit
    return BigInt.asIntN(64, h);
  }

  const lockId = fnv1a64(key);
  try {
    // pg_try_advisory_lock returns boolean
    // Use $queryRaw to get the returned row; adapt to possible return shapes
    const res: any = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${lockId}) as acquired`;
    // res could be an array or object depending on client; normalize
    if (!res) return false;
    if (Array.isArray(res)) {
      const first = res[0];
      return first && (first.acquired === true || first.pg_try_advisory_lock === true || first.acquired === 1);
    }
    return res.acquired === true || res.pg_try_advisory_lock === true || res.acquired === 1;
  } catch (err) {
    console.error('tryAcquireAdvisoryLock error', { key, err: String(err) });
    return false;
  }
}

export async function releaseAdvisoryLock(prisma: PrismaClient, key: string): Promise<boolean> {
  function fnv1a64(str: string): bigint {
    let h = 1469598103934665603n;
    const prime = 1099511628211n;
    for (let i = 0; i < str.length; i++) {
      h ^= BigInt(str.charCodeAt(i));
      h *= prime;
    }
    return BigInt.asIntN(64, h);
  }
  const lockId = fnv1a64(key);
  try {
    const res: any = await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId}) as released`;
    if (!res) return false;
    if (Array.isArray(res)) {
      const first = res[0];
      return first && (first.released === true || first.pg_advisory_unlock === true || first.released === 1);
    }
    return res.released === true || res.pg_advisory_unlock === true || res.released === 1;
  } catch (err) {
    console.error('releaseAdvisoryLock error', { key, err: String(err) });
    return false;
  }
}
