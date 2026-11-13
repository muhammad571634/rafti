import type { AppState } from '@/store/use-app-store';

import { withoutMember } from './group-chat';

/**
 * Everything the user had with a friend, gone: chats (and groups they leave; a group left with one
 * member ends), the bond, memories, moments, plans, notes, board, photos, radio, dates, follow-ups,
 * calls and their diary replies (0z181: Block used to leave alarms, threads, calls and diary replies
 * behind, so a blocked friend still woke the user). An alarm they woke the user with stays, as a
 * plain alarm: a removed friend must not cost a morning. Used by Block, Remove friend and Delete.
 */
export function forgetFriend(s: AppState, characterId: string): Partial<AppState> {
  const gone = new Set(s.conversations.filter((c) => c.characterId === characterId).map((c) => c.id));
  const groups = s.groups.flatMap((g) => {
    const rest = withoutMember(g.memberIds, characterId);
    if (!rest) gone.add(g.id);
    return rest ? [{ ...g, memberIds: rest }] : [];
  });
  const { [characterId]: _bond, ...relationships } = s.relationships;
  return {
    conversations: s.conversations.filter((c) => !gone.has(c.id)),
    groups,
    messages: Object.fromEntries(Object.entries(s.messages).filter(([id]) => !gone.has(id))),
    typing: Object.fromEntries(Object.entries(s.typing).filter(([id]) => !gone.has(id))),
    activeConversationId: s.activeConversationId && gone.has(s.activeConversationId) ? null : s.activeConversationId,
    relationships,
    memories: s.memories.filter((m) => m.characterId !== characterId),
    moments: s.moments.filter((m) => m.characterId !== characterId),
    schedules: s.schedules.filter((x) => x.characterId !== characterId),
    notes: s.notes.filter((n) => n.characterId !== characterId),
    boardPosts: s.boardPosts.filter((p) => p.characterId !== characterId),
    photos: s.photos.filter((p) => p.characterId !== characterId),
    radioClips: s.radioClips.filter((c) => c.characterId !== characterId),
    dateThemes: s.dateThemes.filter((d) => d.characterId !== characterId),
    threads: s.threads.filter((x) => x.characterId !== characterId),
    calls: s.calls.filter((c) => c.characterId !== characterId),
    diary: s.diary.map((d) =>
      d.reply?.characterId === characterId || d.sharedWithCharacterId === characterId
        ? { ...d, reply: d.reply?.characterId === characterId ? undefined : d.reply, sharedWithCharacterId: d.sharedWithCharacterId === characterId ? undefined : d.sharedWithCharacterId }
        : d,
    ),
    alarms: s.alarms.map((a) => (a.characterId === characterId ? { ...a, characterId: undefined } : a)),
    wake: s.wake?.characterId === characterId ? null : s.wake,
    activeDate: s.activeDate?.characterId === characterId ? null : s.activeDate,
    settings: s.settings.callerId === characterId ? { ...s.settings, callerId: undefined } : s.settings,
  };
}

