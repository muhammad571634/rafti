import { useEffect, useRef, type RefObject } from 'react';

import { chatDrafts } from '@/lib/chat-drafts';

/** A pause in typing before the field is saved. */
const SAVE_AFTER_MS = 300;

/**
 * Keeps the field's unsent text for this chat. `held` is the draft waiting while a message is
 * edited: an edit's text is never kept. `given` is text the chat opened with (a reply to a diary
 * page), which goes before what was kept.
 */
export function useKeptDraft(chatId: string | undefined, value: string, setValue: (text: string) => void, held: RefObject<string | null>, given: boolean) {
  /** False until the kept text is read, so an empty field cannot wipe it first. */
  const ready = useRef(false);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
    if (!chatId || !ready.current) return;
    const timer = setTimeout(() => chatDrafts.save(chatId, held.current ?? value), SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [chatId, value, held]);

  useEffect(() => {
    if (!chatId) return;
    let live = true;
    if (given) ready.current = true;
    else
      void chatDrafts.read(chatId).then((text) => {
        if (!live) return;
        ready.current = true;
        // Whatever arrived in the field meanwhile wins.
        if (text && !latest.current.trim() && held.current === null) setValue(text);
      });
    return () => {
      live = false;
      if (ready.current) chatDrafts.save(chatId, held.current ?? latest.current);
    };
    // Once per chat; `ChatInput` is keyed by it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);
}
