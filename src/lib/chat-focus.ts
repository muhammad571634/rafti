/**
 * A message the chat should scroll to and flash when it is next shown (a search result, as in
 * iOS Messages). Kept outside the store: it lives only until the chat picks it up.
 */
let pending: { conversationId: string; messageId: string } | null = null;

export function focusMessage(conversationId: string, messageId: string) {
  pending = { conversationId, messageId };
}

/** The message to show in this chat, once; later calls return undefined. */
export function takeFocus(conversationId: string): string | undefined {
  if (!pending || pending.conversationId !== conversationId) return undefined;
  const { messageId } = pending;
  pending = null;
  return messageId;
}
