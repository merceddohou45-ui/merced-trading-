import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const { broker, apiKey, apiSecret } = body;
  // authentication should be handled by NextAuth middleware; below we assume session
  // For now, require Authorization: Bearer <token> header and verify in real code
  if (!broker || !apiKey || !apiSecret) return NextResponse.json({ error: 'missing' }, { status: 400 });

  const encryptedKey = encrypt(apiKey);
  const encryptedSecret = encrypt(apiSecret);

  // TODO: replace with real userId from session
  const userId = body.userId || null;
  const created = await prisma.apiKey.create({ data: { broker, encryptedKey, encryptedSecret, userId } });
  return NextResponse.json({ ok: true, id: created.id });
}
