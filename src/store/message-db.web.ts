import type { MessageDiff, MessagesByChat } from '@/lib/message-diff';

/** Web keeps messages in the one save, as before (`capMessages`); see `message-db.ts`. */
export const messageDbAvailable = false;

export const messagesImported = async () => false;
export const importMessages = async (_byChat: MessagesByChat) => {};
export const loadMessages = async (): Promise<MessagesByChat> => ({});
export const writeMessageDiff = async (_diff: MessageDiff) => {};
export const countMessages = async () => 0;
