import type { TFunction } from 'i18next';
import { Platform } from 'react-native';

import { PLANS } from '@/economy/plans';
import i18n from '@/i18n';
import type { PlanId } from '@/types';

/**
 * Shared wording for plans, so the store, My plan and every sheet say the same thing
 * about the same numbers. The numbers themselves come from `src/economy/plans.ts`.
 */

export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Months one purchase covers: 1 or 12. */
export const planMonths = (plan: PlanId) => Math.round(PLANS[plan].termDays / 30);

/** "$20" (or "$8.33") — what a yearly plan comes to per month. */
export const perMonth = (plan: PlanId) => {
  const amount = Math.round((PLANS[plan].amount / planMonths(plan)) * 100) / 100;
  return Number.isInteger(amount) ? `$${amount}` : usd.format(amount);
};

/** What a yearly plan saves against paying its monthly twin every month, in percent. */
export const savingVsMonthly = (plan: PlanId, monthly: PlanId) =>
  Math.round((1 - PLANS[plan].amount / (PLANS[monthly].amount * planMonths(plan))) * 100);

/** "1 hour", "2.5 hours", "30 min". */
export function planTime(t: TFunction, seconds: number) {
  if (seconds >= 3600) return t('plans.hours', { count: Math.round((seconds / 3600) * 10) / 10 });
  return t('plans.minutes', { count: Math.round(seconds / 60) });
}

/** Whole minutes for "42 of 60 min left": rounded down, so it never promises more. */
export const wholeMinutes = (seconds: number) => Math.floor(Math.max(0, seconds) / 60);

/** "Nov 3", with the year when it is not this year. */
export function planDate(ms: number) {
  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(i18n.language, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "$9.99 a month", "$24.99 every 3 months". */
export const planPrice = (t: TFunction, plan: PlanId) => t(`plans.price.${plan}`, { price: PLANS[plan].price });

/** Where the user cancels: the store that bills them. */
export const storeName = (t: TFunction) => t(Platform.OS === 'ios' ? 'plans.appStore' : 'plans.googlePlay');

export const SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
