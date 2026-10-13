import type { Wallet } from '@/types';

/**
 * Free shells (check-in, wheel, ads, share, invite, welcome) live in today's free bucket:
 * spent first and burnt to zero at the user's midnight. Only bought shells stay
 * (owner decision 2026-10-13). Pure on purpose, like plans.ts: the server copies it.
 */
export function creditFree(wallet: Wallet, amount: number, today: string): Wallet {
  const already = wallet.free && wallet.free.day === today ? wallet.free.amount : 0;
  return { ...wallet, shells: wallet.shells + amount, free: { day: today, amount: already + amount } };
}
