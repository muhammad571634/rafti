import type { MessageDiff, MessagesByChat } from '@/lib/message-diff';
import type { MessagesPage } from '@/ai/session-types';

import type { OutboxBatch } from './message-db';

/** Web keeps messages in the one save, as before (`capMessages`); see `message-db.ts`. */
export const messageDbAvailable = false;

export const messagesImported = async () => false;
export const importMessages = async (_byChat: MessagesByChat) => {};
export const loadMessages = async (): Promise<MessagesByChat> => ({});
export const writeMessageDiff = async (_diff: MessageDiff) => {};
export const countMessages = async () => 0;
export const countUnsent = async () => 0;
export const readOutbox = async (_limits: { upserts: number; deletedIds: number; droppedChats: number }): Promise<OutboxBatch | null> => null;
export const markSent = async (_batch: OutboxBatch) => {};
export const saveRestored = async (_page: MessagesPage['messages']) => {};
export const wipeMessages = async () => {};
