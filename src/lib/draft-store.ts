/** What the drafts need from storage; AsyncStorage on the phone, a fake in tests. */
export interface DraftStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

type Drafts = Record<string, string>;

const KEY = 'sigmazam.chatDrafts';

function parse(raw: string | null): Drafts {
  try {
    const value = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {};
  }
}

/**
 * The unsent text of each chat, as in iOS Messages: leave a chat half way through a line and it
 * waits in the field. All of them share one small save, read on first use; every change waits its
 * turn, so a save made during the first read is not lost.
 */
export function draftStore(storage: DraftStorage) {
  let queue: Promise<Drafts> | null = null;
  const loaded = () => (queue ??= storage.getItem(KEY).then(parse).catch((): Drafts => ({})));
  /** Chats deleted in this run: a screen closing behind the delete must not save its text back. */
  const gone = new Set<string>();

  const clear = (chatId: string) =>
    update((drafts) => {
      if (!(chatId in drafts)) return drafts;
      const { [chatId]: _old, ...rest } = drafts;
      return rest;
    });

  const update = (change: (drafts: Drafts) => Drafts) => {
    queue = loaded().then(async (drafts) => {
      const next = change(drafts);
      if (next !== drafts) await storage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return {
    read: (chatId: string) => loaded().then((drafts) => drafts[chatId] ?? ''),
    /** Spaces alone are not a draft: an empty field removes it. */
    save: (chatId: string, text: string) => {
      if (gone.has(chatId)) return;
      update((drafts) => {
        const kept = text.trim() ? text : '';
        if ((drafts[chatId] ?? '') === kept) return drafts;
        const { [chatId]: _old, ...rest } = drafts;
        return kept ? { ...rest, [chatId]: kept } : rest;
      });
    },
    clear,
    /** The chat itself is deleted. */
    forget: (chatId: string) => {
      gone.add(chatId);
      clear(chatId);
    },
    clearAll: () => update(() => ({})),
  };
}
