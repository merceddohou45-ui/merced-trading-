# Merced Trading Robot

Scaffold for the MERCED'S TRADING ROBOT MVP. Branch: feature/mvp-trading-robot

This initial commit adds:
- Next.js 14 App Router scaffold
- TailwindCSS
- Prisma schema for User, ApiKey, Signal, Trade
- NextAuth (Credentials provider) + Prisma adapter
- AES-GCM encryption utility for API keys
- WebSocket server stub
- Worker stub for market data processing

Next steps:
1. Set environment variables in production: DATABASE_URL, NEXTAUTH_SECRET, MASTER_KEY
2. Run `npx prisma migrate dev` to create DB
3. Implement the full signal engine and UI pages (indicators, dashboard, settings)
