import type { BootstrapInput, BootstrapResult } from '../../../src/ai/session-types.ts';

export type { BootstrapInput, BootstrapResult };

/**
 * The database behind the API (backend-plan §1.4: every provider sits behind an interface).
 * Supabase today (`supabase.ts`); tests pass a fake.
 */
export interface Db {
  name: string;
  /** The signed-in user behind an access token, or null when the token is not valid. */
  userIdFromToken(token: string): Promise<string | null>;
  /** First call creates the profile and wallet and pays the welcome gift; later calls only read. */
  bootstrap(userId: string, input: BootstrapInput): Promise<BootstrapResult>;
}
