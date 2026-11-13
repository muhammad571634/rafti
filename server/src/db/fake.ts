import type { Db } from './types.ts';

/** A Db for one test: "good" is user-1's token, and every call the test does not fill in fails. */
export function makeDb(overrides: Partial<Db>): Db {
  const unused = () => Promise.reject(new Error('unused in this test'));
  return {
    name: 'fake',
    userIdFromToken: async (token) => (token === 'good' ? 'user-1' : null),
    bootstrap: unused,
    logUsage: async () => {},
    walletState: unused,
    walletSpend: unused,
    walletCredit: unused,
    walletCheckIn: unused,
    walletSpin: unused,
    walletShare: unused,
    syncMessages: unused,
    messagesAfter: unused,
    syncMemories: unused,
    memoriesOf: unused,
    saveReport: unused,
    deleteUser: unused,
    ...overrides,
  };
}
