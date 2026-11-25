/**
 * The wallet slice of the app store: shells, today's free messages, check-in, wheel, shares, invites and
 * plans, with the server sync behind them (B1.2, 0z142, 0z260). Split out of `use-app-store.ts`
 * (0z350, app audit P1-6); the persisted shape is unchanged, so no migration.
 */
import type { AppState } from './use-app-store';
import type { Getter, RawSetter, Setter } from './slice-types';
import { uid } from './ids';
import { sendReports } from './reports';
import { withAccount } from '@/ai/account';
import { apiBase, serverWallet } from '@/ai/server';
import type { MessageCharge, WalletState } from '@/ai/session-types';
import { freeMessagesPerDay, usedToday } from '@/economy/free-messages';
import { hasFullMemory, splitMemories } from '@/economy/memory-limit';
import { isPayReason, notePay } from '@/economy/pay-keys';
import { type MinutesKind, PLANS, TOP_UPS, TRIAL, canRing, consumeMinutes, minutesLeft, onPaidPlan, rollSubscription, shellGrant, startSubscription } from '@/economy/plans';
import { type QuickCreateUse, quickCreatesLeft, quickCreatesPerDay } from '@/economy/quick-create';
import { PAID_SHARES_PER_DAY, SHARE_REWARD, creditFree, expiryBooked } from '@/economy/shells';
import { THOUGHT_SHELLS, thoughtsLeft } from '@/economy/thoughts';
import { inviteCodeFor, normalizeInviteCode } from '@/lib/invite';
import { canPayShare } from '@/lib/share-outcome';
import { DAILY_CHECK_IN, FREE_SPINS_PER_DAY, INVITE_REWARD, WHEEL_SEGMENTS, WHEEL_WEIGHTS, dateFromKey, dayKey, rollCheckIn, todayKey } from '@/mock';
import type { DailyState, LedgerEntry, LedgerReason, MemoryItem, Wallet } from '@/types';

/** A plan or its trial is running. Chat still costs shells (the credit model, backend-plan §15.10). */
export const memberActive = (wallet: Wallet, now = Date.now()) => !!rollSubscription(wallet.subscription, now);

/**
 * One character's memories split into open and locked: 20 open without a plan, all with one
 * (`src/economy/memory-limit.ts`). Locked ones stay saved and open again with any plan.
 */
export const memoryAccess = (memories: MemoryItem[], wallet: Wallet, characterId: string, now = Date.now()) =>
  splitMemories(memories, characterId, hasFullMemory(wallet.subscription, now));

const sharesPaid = (daily: DailyState, today: string) => (daily.shareDay === today ? (daily.sharesPaid ?? 0) : 0);
const paidKeysToday = (daily: DailyState, today: string) => (daily.shareDay === today ? (daily.sharePaidKeys ?? []) : []);

/** What sharing a card pays now: `SHARE_REWARD` while today's paid shares last, then 0. */
/** What sharing `key`'s card would pay now: 0 once today's paid shares are used or that card paid today. */
export const shareReward = (daily: DailyState, key?: string, today = todayKey()) =>
  sharesPaid(daily, today) < PAID_SHARES_PER_DAY && canPayShare(paidKeysToday(daily, today), key) ? SHARE_REWARD : 0;

/** Quick creates left today on the user's plan. */
export const quickCreatesToday = (use: QuickCreateUse | undefined, wallet: Wallet, today = todayKey()) =>
  quickCreatesLeft(use, today, quickCreatesPerDay(wallet.subscription, Date.now()));

/** The plan includes live calls and voice replies: Pro or the trial, not Basic. */
export const callsIncluded = (wallet: Wallet, now = Date.now()) => canRing(wallet.subscription, now);

/** Call or voice-reply minutes left: the plan's this period, then bought packs. In seconds. */
export const minutesOf = (wallet: Wallet, kind: MinutesKind, now = Date.now()) =>
  minutesLeft(wallet.subscription, wallet.packs, kind, now);

/**
 * Where today falls in the 7-day check-in week, and whether it is collected yet.
 * A missed day restarts the week. The claim and the Today card share this rule.
 */
export function checkInStatus(daily: DailyState, today = todayKey()) {
  if (daily.lastLoginDay === today) return { day: Math.max(1, daily.checkInDay), claimed: true };
  const yesterday = dateFromKey(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const consecutive = daily.lastLoginDay === dayKey(yesterday);
  return { day: consecutive ? (daily.checkInDay % DAILY_CHECK_IN.length) + 1 : 1, claimed: false };
}

/**
 * The wallet lives on the server whenever the app has one (B1.2), so one ledger pays the welcome
 * gift and each day's check-in. Profile (dev) → Server wallet off keeps it on the phone; switching
 * mid-day leaves the phone's own rows of that day in History while the server pays its own.
 */
export const serverWalletOn = (get: Getter) => get().settings.serverWallet !== false && !!apiBase();

/** Wallet calls still out: only the last answer is applied, as it holds every booking before it. */
let walletCallsOut = 0;

/** No wallet call is out, so the server's answer can be applied as the whole truth. */
export const walletIdle = () => walletCallsOut === 0;

/**
 * Sends one wallet call and takes the server's wallet as the truth once no other call is out. A
 * refused or failed call reads the wallet again, so the balance shown never drifts from the server.
 */
export function syncWallet(set: Setter, run: (accessToken: string) => Promise<WalletState | null>) {
  walletCallsOut++;
  void withAccount(run)
    .then((wallet) => wallet ?? withAccount((token) => serverWallet.state(token)))
    .catch(() => null)
    .then((wallet) => {
      walletCallsOut--;
      if (wallet && walletCallsOut === 0) applyServerWallet(set, wallet);
    });
}

/**
 * The server's check-in runs in the background, so it waits for the sign-in as long as a cold
 * start needs and tries again until the server has answered for the phone's day. Giving up after
 * the usual 2.5 s lost whole days on the A51, and with them the streak (0z96).
 */
export const CHECK_IN_WAIT_MS = 20_000;
const CHECK_IN_RETRIES_MS = [30_000, 120_000, 600_000];
let checkedInDay: string | null = null;
/** A new account checks in on its own first day (account deletion). */
export const resetCheckIn = () => {
  checkedInDay = null;
};
let checkingIn = false;

export function serverCheckIn(set: Setter, attempt = 0) {
  const today = todayKey();
  if (checkedInDay === today || checkingIn) return;
  checkingIn = true;
  void withAccount((token) => serverWallet.checkIn(token), CHECK_IN_WAIT_MS)
    .catch(() => null)
    .then((result) => {
      checkingIn = false;
      if (!result) {
        const wait = CHECK_IN_RETRIES_MS[attempt];
        if (wait !== undefined) setTimeout(() => serverCheckIn(set, attempt + 1), wait);
        return;
      }
      // An amount of 0 is an answer too: today was already claimed.
      checkedInDay = today;
      applyServerWallet(set, result.wallet);
      if (result.amount > 0) {
        set((s) => ({
          ledger: log(s.ledger, result.amount, 'daily'),
          daily: { ...s.daily, checkInAmount: result.amount },
          dailyReward: { amount: result.amount, day: result.day },
        }));
      }
    });
}

/** The server's wallet into the store: the balance, today's free bucket, the check-in and wheel days. */
export function applyServerWallet(set: Setter, wallet: WalletState) {
  set((s) => ({
    wallet: { ...s.wallet, shells: wallet.shells, free: wallet.free ?? undefined, boughtShells: s.wallet.boughtShells || wallet.boughtShells },
    daily: {
      ...s.daily,
      lastLoginDay: wallet.checkIn.lastDay ?? s.daily.lastLoginDay,
      checkInDay: wallet.checkIn.lastDay ? wallet.checkIn.streak : s.daily.checkInDay,
      spinDay: wallet.today,
      spinsUsed: wallet.spinsToday,
    },
  }));
}

/**
 * The plan on the server (0z142): with the wallet there, the server pays the monthly shells (the
 * phone's own payment came back out on the next sync). Before billing it takes a plan with no store
 * behind it only from test accounts; any other account is refused and keeps the phone's minutes.
 * Once per term: `planOnServer` holds the term start the server knows.
 */
export function planToServer(set: Setter, get: Getter) {
  const sub = get().wallet.subscription;
  if (!serverWalletOn(get) || !sub || get().wallet.planOnServer === sub.termStart) return;
  walletCallsOut++;
  void withAccount((token) => serverWallet.testPlan(token, { plan: sub.plan, trial: sub.status === 'trial' }))
    .catch(() => null)
    .then((answer) => {
      walletCallsOut--;
      if (!answer) return;
      // A new plan on the server is a new period there, paid at once: the history says so here too.
      const paid = sub.status !== 'trial' && answer.subscription?.status === 'active';
      const period = shellGrant(sub, undefined, Date.now())?.periodStart;
      set((s) => ({
        wallet: { ...s.wallet, planOnServer: sub.termStart, ...(paid && period ? { planShellsPeriod: period } : {}) },
        ledger: paid ? log(s.ledger, PLANS[sub.plan].shells, 'plan') : s.ledger,
      }));
      if (walletCallsOut === 0) applyServerWallet(set, answer.wallet);
    });
}

/** Pays the plan's monthly shells once per period (`shellGrant`); they never burn. The server pays them when the wallet is there. */
export function payPlanShells(set: Setter, get: Getter) {
  const { wallet } = get();
  const due = shellGrant(wallet.subscription, wallet.planShellsPeriod, Date.now());
  if (!due) return;
  // With the wallet on the server, the server pays (on the wallet read that follows); here only the
  // history row, once the server knows the plan (`planToServer`).
  if (serverWalletOn(get)) {
    if (wallet.planOnServer !== wallet.subscription?.termStart) return;
    set((s) => ({ wallet: { ...s.wallet, planShellsPeriod: due.periodStart }, ledger: log(s.ledger, due.amount, 'plan') }));
    return;
  }
  set((s) => ({
    wallet: { ...s.wallet, shells: s.wallet.shells + due.amount, planShellsPeriod: due.periodStart },
    ledger: log(s.ledger, due.amount, 'plan'),
  }));
}

/** A message is paid by today's free count, then a shell (audit §6.3; `payLine`). */
export function chargeMessage(get: Getter, cost: number, reason: LedgerReason, conversationId: string) {
  const characterId = get().conversations.find((c) => c.id === conversationId)?.characterId;
  return payLine(get, cost, reason, conversationId, characterId);
}

/**
 * Pays for a line the user sends (audit §6.3, shape B): a text or a voice line uses today's free count
 * first (a plan's fair use), then a shell; a photo always takes its shell (it costs more to read).
 * The line gets one key (0z260): the chat's reply request carries it (`payFor`), so the server
 * decides the same line once, and a shell spent here is mirrored under that key.
 */
export function payLine(get: Getter, cost: number, reason: LedgerReason, chat: string, characterId?: string) {
  const key = uid('pay');
  const paid = ((reason === 'chat' || reason === 'voice') && get().takeFreeMessage()) || get().spendShells(cost, reason, characterId, key);
  if (paid && isPayReason(reason)) notePay(chat, key, reason);
  return paid;
}

/**
 * The server's decision on a line (0z260, while it charges): its wallet and today's free count are
 * the truth. The wallet waits while other wallet calls are out, as `syncWallet` does.
 */
export function applyCharge(set: Setter, charge: MessageCharge | undefined) {
  if (!charge) return;
  if (walletCallsOut === 0) applyServerWallet(set, charge.wallet);
  if (charge.wallet.today === todayKey()) set((s) => ({ daily: { ...s.daily, freeDay: charge.wallet.today, freeUsed: charge.freeUsed } }));
}

/** Books call time in the history, in seconds: what a plan or top-up added, what a call used. */
export function logSeconds(set: Setter, seconds: number, reason: LedgerReason, characterId?: string) {
  set((s) => ({
    ledger: [{ ...log([], seconds, reason, characterId)[0], unit: 'seconds' as const }, ...s.ledger],
  }));
}

/** Counts a sent message toward today's total (stats; there is no daily cap in the credit model). */
export function countMessage(set: Setter, get: Getter) {
  const today = todayKey();
  const sent = get().daily.messagesDay === today ? (get().daily.messagesSent ?? 0) : 0;
  set((s) => ({ daily: { ...s.daily, messagesDay: today, messagesSent: sent + 1 } }));
}

/** Takes voice-reply seconds from the plan or packs; false when none are left. */
export function spendVoice(set: Setter, get: Getter, seconds: number) {
  const { wallet } = get();
  if (minutesOf(wallet, 'voice').total <= 0) return false;
  const used = consumeMinutes(wallet.subscription, wallet.packs, 'voice', seconds, Date.now());
  set((s) => ({ wallet: { ...s.wallet, subscription: used.subscription, packs: used.packs } }));
  return true;
}

/** The wheel's segment: an index drawn by weight. */
function weightedIndex(weights: readonly number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

/** History is kept for six months; older lines drop off. */
const LEDGER_DAYS = 183;

export function log(
  ledger: LedgerEntry[],
  amount: number,
  reason: LedgerReason,
  characterId?: string,
  at = new Date().toISOString(),
): LedgerEntry[] {
  const cutoff = Date.now() - LEDGER_DAYS * 86_400_000;
  return [{ id: uid('l'), at, amount, reason, characterId }, ...ledger.filter((e) => Date.parse(e.at) >= cutoff)];
}


type WalletActions = Pick<
  AppState,
  | 'takeFreeMessage' | 'seeFreeOut' | 'openThought' | 'spendShells' | 'addShells' | 'expireFreeShells' | 'claimDailyLogin'
  | 'dismissDailyReward' | 'redeemInvite' | 'settleInvite' | 'spinWheel' | 'rewardShare' | 'syncServerWallet' | 'subscribe'
  | 'topUpMinutes' | 'endPlan'
>;

/** The wallet's actions, spread into the store's creator. */
export const walletActions = (set: RawSetter, get: Getter): WalletActions => ({
  /* ── economy ──────────────────────────────────────────────────────── */

  takeFreeMessage: () => {
    const today = todayKey();
    const { daily, wallet } = get();
    const used = usedToday(daily.freeDay, daily.freeUsed, today);
    if (used >= freeMessagesPerDay(wallet.subscription, Date.now())) return false;
    set((s) => ({ daily: { ...s.daily, freeDay: today, freeUsed: used + 1 } }));
    return true;
  },

  seeFreeOut: () => set((s) => ({ daily: { ...s.daily, freeOutDay: todayKey() } })),

  openThought: (conversationId, messageId, pay = false) => {
    const state = get();
    const message = state.messages[conversationId]?.find((m) => m.id === messageId);
    if (!message?.thought) return 'none';
    if (message.thoughtRead) return 'open';
    const today = todayKey();
    const left = thoughtsLeft(state.wallet.subscription, state.daily.thoughtDay, state.daily.thoughtsUsed, today, Date.now());
    if (left > 0) {
      const used = state.daily.thoughtDay === today ? (state.daily.thoughtsUsed ?? 0) : 0;
      set((s) => ({ daily: { ...s.daily, thoughtDay: today, thoughtsUsed: used + 1 } }));
    } else {
      if (!pay) return 'pay';
      const characterId = state.conversations.find((c) => c.id === conversationId)?.characterId;
      // Booked as chat: the thought is part of their reply (the server's spend reasons stay as they are).
      if (!get().spendShells(THOUGHT_SHELLS, 'chat', characterId)) return 'noShells';
    }
    set((s) => ({
      messages: { ...s.messages, [conversationId]: (s.messages[conversationId] ?? []).map((m) => (m.id === messageId ? { ...m, thoughtRead: true } : m)) },
    }));
    return 'open';
  },

  spendShells: (amount, reason = 'other', characterId, key) => {
    get().expireFreeShells();
    const { wallet } = get();
    if (wallet.shells < amount) return false;
    const today = todayKey();
    // Today's free shells go first, so bought ones last longer (a bucket dated after today too:
    // the time zone moved west).
    const free =
      wallet.free && wallet.free.day >= today
        ? { ...wallet.free, amount: Math.max(0, wallet.free.amount - amount) }
        : wallet.free;
    set((s) => ({
      wallet: { ...s.wallet, shells: s.wallet.shells - amount, free },
      ledger: log(s.ledger, -amount, reason, characterId),
    }));
    // With the wallet on the server the spend shows at once and the server's answer settles it.
    if (serverWalletOn(get)) syncWallet(set, (token) => serverWallet.spend(token, { amount, reason, key: key ?? uid('sp'), characterId }));
    return true;
  },

  addShells: (amount, reason = 'purchase') => {
    set((s) => ({
      wallet: {
        ...s.wallet,
        shells: s.wallet.shells + amount,
        // The starter pack is offered only until the first purchase.
        boughtShells: s.wallet.boughtShells || reason === 'purchase',
      },
      ledger: log(s.ledger, amount, reason),
    }));
    // Earnings with no rule on the server yet; a server that takes none puts the balance back.
    // The server pays the welcome gift itself when it makes the account, so that one is only booked here.
    if (serverWalletOn(get) && reason !== 'welcome') {
      syncWallet(set, (token) => serverWallet.grant(token, { amount, reason, key: uid('gr') }));
    }
  },

  expireFreeShells: () => {
    const { wallet } = get();
    const free = wallet.free;
    if (!free || free.day >= todayKey()) return;
    const gone = Math.min(free.amount, wallet.shells);
    // Booked at the midnight they ran out, so the history reads in order.
    const midnight = dateFromKey(free.day);
    midnight.setDate(midnight.getDate() + 1);
    const at = midnight.toISOString();
    set((s) => ({
      wallet: { ...s.wallet, shells: s.wallet.shells - gone, free: undefined },
      ledger: gone > 0 && !expiryBooked(s.ledger, at) ? log(s.ledger, -gone, 'expired', undefined, at) : s.ledger,
    }));
  },

  claimDailyLogin: () => {
    get().expireFreeShells();
    // A plan's monthly shells arrive with the first open of each period.
    payPlanShells(set, get);
    // An invite code entered on an earlier day pays out on this open.
    get().settleInvite();
    // A report that could not reach the server goes again.
    sendReports(set, get);
    // With the wallet on the server, the server checks in (in the user's time zone) and the
    // shells arrive quietly a moment later, as they do here.
    if (serverWalletOn(get)) {
      serverCheckIn(set);
      // A plan the server does not know yet (bought before 0z142): it learns it, and pays from then on.
      planToServer(set, get);
      return 0;
    }
    // The check-in's shells are for free users only (owner, 2026-11-07): a paid plan has its own.
    if (onPaidPlan(get().wallet.subscription, Date.now())) return 0;
    const today = todayKey();
    const { daily } = get();
    const { day, claimed } = checkInStatus(daily, today);
    if (claimed) return 0;

    const amount = rollCheckIn(day);
    set((s) => ({
      daily: { ...s.daily, lastLoginDay: today, checkInDay: day, checkInAmount: amount },
      wallet: creditFree(s.wallet, amount, today),
      ledger: log(s.ledger, amount, 'daily'),
      // The Today sheet is back (owner, 2026-11-07, replacing the quiet check-in of 10-09):
      // its Collect pours the day's shells into the wallet (Coin Drop Reward).
      dailyReward: { amount, day },
    }));
    return amount;
  },

  dismissDailyReward: () => set({ dailyReward: null }),

  redeemInvite: (input) => {
    const { user } = get();
    const code = normalizeInviteCode(input);
    if (!code) return 'invalid';
    if (user.redeemedInvite) return 'used';
    if (code === inviteCodeFor(user)) return 'own';
    // Nothing is paid yet: the shells come when the user is back on a later day
    // (`settleInvite`). The server checks the code exists and credits the friend who sent it.
    set((s) => ({ user: { ...s.user, redeemedInvite: code, invitePending: { code, day: todayKey() } } }));
    return 'ok';
  },

  settleInvite: () => {
    const pending = get().user.invitePending;
    if (!pending || pending.day >= todayKey()) return 0;
    // Back on a later day: the friend is real. Paid like bought shells, so they never burn.
    get().addShells(INVITE_REWARD, 'invite');
    set((s) => ({ user: { ...s.user, invitePending: undefined } }));
    return INVITE_REWARD;
  },

  spinWheel: async () => {
    const today = todayKey();
    const daily = get().daily;
    const used = daily.spinDay === today ? daily.spinsUsed : 0;

    // One free spin a day, and no more: the app shows no ads (owner, 2026-10-22).
    if (used >= FREE_SPINS_PER_DAY) return null;

    // With the wallet on the server, the server draws the segment and pays it.
    if (serverWalletOn(get)) {
      const result = await withAccount((token) => serverWallet.spin(token));
      if (!result) return null;
      applyServerWallet(set, result.wallet);
      if (result.index == null) return null;
      set((s) => ({ ledger: log(s.ledger, result.reward, 'spin') }));
      return { index: result.index, reward: result.reward };
    }

    const index = weightedIndex(WHEEL_WEIGHTS);
    const reward = WHEEL_SEGMENTS[index];

    get().expireFreeShells();
    set((s) => ({
      daily: { ...s.daily, spinDay: today, spinsUsed: used + 1 },
      wallet: creditFree(s.wallet, reward, today),
      ledger: log(s.ledger, reward, 'spin'),
    }));
    return { index, reward };
  },

  rewardShare: async (key) => {
    const today = todayKey();
    const paid = sharesPaid(get().daily, today);
    // The same card (a friend's chat, a bond) pays once a day, whatever the daily cap says.
    if (!canPayShare(paidKeysToday(get().daily, today), key)) return 0;
    const keys = key ? [...paidKeysToday(get().daily, today), key] : paidKeysToday(get().daily, today);

    // With the wallet on the server, the server keeps the daily cap and pays; the count here
    // only tells the share buttons whether to show "+5".
    if (serverWalletOn(get)) {
      const result = await withAccount((token) => serverWallet.share(token));
      if (!result) return 0;
      applyServerWallet(set, result.wallet);
      set((s) => ({
        daily: { ...s.daily, shareDay: today, sharesPaid: PAID_SHARES_PER_DAY - result.left, sharePaidKeys: result.amount > 0 ? keys : paidKeysToday(s.daily, today) },
        ledger: result.amount > 0 ? log(s.ledger, result.amount, 'share') : s.ledger,
      }));
      return result.amount;
    }

    if (paid >= PAID_SHARES_PER_DAY) return 0;
    get().expireFreeShells();
    set((s) => ({
      daily: { ...s.daily, shareDay: today, sharesPaid: paid + 1, sharePaidKeys: keys },
      wallet: creditFree(s.wallet, SHARE_REWARD, today),
      ledger: log(s.ledger, SHARE_REWARD, 'share'),
    }));
    return SHARE_REWARD;
  },

  syncServerWallet: async () => {
    const wallet = await withAccount((token) => serverWallet.state(token));
    if (wallet) applyServerWallet(set, wallet);
  },

  subscribe: (plan, trial = false) => {
    if (trial && get().wallet.trialUsed) return;
    // A new plan (or a switch) starts today with a fresh allowance, as the store would bill it.
    const subscription = startSubscription(plan, Date.now(), trial);
    set((s) => ({ wallet: { ...s.wallet, subscription, trialUsed: s.wallet.trialUsed || trial } }));
    // The call-time history shows what the plan brought (Basic brings none).
    const callSeconds = trial ? TRIAL.callSeconds : PLANS[plan].callSeconds;
    if (callSeconds > 0) logSeconds(set, callSeconds, trial ? 'trial' : 'membership');
    // The first month's shells come right away; the trial brings none.
    payPlanShells(set, get);
    planToServer(set, get);
  },

  topUpMinutes: (kind) => {
    const { seconds, shells } = TOP_UPS[kind];
    if (!get().spendShells(shells, 'topUp')) return 'noShells';
    const pack = { id: uid('mp'), kind, seconds, used: 0, boughtAt: new Date().toISOString() };
    set((s) => ({ wallet: { ...s.wallet, packs: [...(s.wallet.packs ?? []), pack] } }));
    if (kind === 'call') logSeconds(set, seconds, 'topUp');
    return 'ok';
  },

  endPlan: () => set((s) => ({ wallet: { ...s.wallet, subscription: undefined } })),
});
