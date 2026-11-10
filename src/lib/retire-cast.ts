import type { AppState } from '@/store/use-app-store';
import type { Character } from '@/types';

import { forgetFriend } from './forget-friend';

/**
 * The first official cast (55 people in seven worlds), retired by Cast 2.0 (docs/cast-2.md,
 * 2026-11-10). A phone that saved any of them must not keep them as friends it cannot delete.
 */
export const CAST_1_IDS: ReadonlySet<string> = new Set([
  'c_kai', 'c_elio', 'c_theo', 'c_hana', 'c_iris', 'c_rowan', 'c_jun', 'c_noah', 'c_tessa', 'c_felix',
  'c_aurelian', 'c_castor', 'c_zarek', 'c_seraphine', 'c_vesper', 'c_rhys', 'c_lyra', 'c_kael', 'c_orin', 'c_corvin',
  'c_ezra', 'c_seren', 'c_kiro', 'c_minu', 'c_haze', 'c_rio', 'c_dex', 'c_ari', 'c_juno', 'c_cass',
  'c_adrian', 'c_lucas', 'c_sol', 'c_marco', 'c_ivy', 'c_gideon', 'c_ren', 'c_hugo', 'c_nadia', 'c_cole',
  'c_ronan', 'c_isolde', 'c_mara', 'c_luca', 'c_viv',
  'c_leander', 'c_alaric', 'c_dorian', 'c_celestine', 'c_odile',
  'c_erik', 'c_teddy', 'c_freya', 'c_sasha', 'c_priya',
]);

/** What `forgetFriend` reads, for a save made before one of these existed. */
const EMPTY: Partial<AppState> = {
  conversations: [],
  groups: [],
  messages: {},
  typing: {},
  relationships: {},
  memories: [],
  moments: [],
  schedules: [],
  notes: [],
  boardPosts: [],
  photos: [],
  radioClips: [],
  dateThemes: [],
  threads: [],
  calls: [],
  diary: [],
  alarms: [],
  settings: {} as AppState['settings'],
};

/** Every saved official character the current cast no longer has, plus anyone of the first cast. */
export function retiredIds(saved: readonly Pick<Character, 'id' | 'isOfficial'>[], seedIds: ReadonlySet<string>) {
  const ids = new Set([...CAST_1_IDS].filter((id) => !seedIds.has(id)));
  for (const c of saved) if (c.isOfficial && !seedIds.has(c.id)) ids.add(c.id);
  return ids;
}

/**
 * A saved state with every retired official character gone, as if the user had removed each one
 * (`forgetFriend`): chats, bond, memories, moments, plans, notes, photos, calls and the rest; an
 * alarm they woke the user with stays as a plain alarm. Characters the user made, and everything
 * with them, are untouched. Only keys the save already had are written back, so nothing that is not
 * saved (typing, the open chat) leaks into it. Pure: the store's migration calls it.
 */
export function retireCast<S extends Partial<AppState>>(state: S, seedIds: ReadonlySet<string>): S {
  const retired = retiredIds(state.characters ?? [], seedIds);
  let full = { ...EMPTY, ...state } as AppState;
  for (const id of retired) full = { ...full, ...forgetFriend(full, id) };
  const gone = (id?: string) => !!id && retired.has(id);
  const kept: Partial<AppState> = {
    ...full,
    characters: (state.characters ?? []).filter((c) => !gone(c.id)),
    characterDiary: (state.characterDiary ?? []).filter((p) => !gone(p.characterId)),
    care: (state.care ?? []).filter((c) => !gone(c.characterId)),
    pushOutbox: (state.pushOutbox ?? []).filter((o) => !gone(o.characterId)),
    dates: (state.dates ?? []).filter((d) => !gone(d.characterId)),
    streams: (state.streams ?? []).filter((x) => !x.characterIds.some(gone)),
    selfQuizzes: Object.fromEntries(Object.entries(state.selfQuizzes ?? {}).filter(([id]) => !gone(id))),
    recentlyViewed: (state.recentlyViewed ?? []).filter((id) => !gone(id)),
    blockedIds: (state.blockedIds ?? []).filter((id) => !gone(id)),
    // Written ahead for pushes from people who are gone; the next sync writes the rest again.
    pushLines: {},
    // The worlds went with the cast: their frames and their news.
    wonFrames: [],
    daily: state.daily ? { ...state.daily, worldNewsSent: [] } : state.daily,
  };
  const next = { ...state };
  for (const key of Object.keys(kept) as (keyof AppState)[]) {
    if (key in state) (next as Record<string, unknown>)[key] = kept[key];
  }
  return next;
}

/**
 * The chats a retirement ended (their one-to-one chats and groups left with one member). Their
 * lines live in the on-device database as well, which the save never held, so the store drops them
 * once the database has loaded (`dropChats` in the store).
 */
export function endedChats(before: Partial<AppState>, after: Partial<AppState>): string[] {
  const ids = (s: Partial<AppState>) => [...(s.conversations ?? []).map((c) => c.id), ...(s.groups ?? []).map((g) => g.id)];
  const kept = new Set(ids(after));
  return ids(before).filter((id) => !kept.has(id));
}
