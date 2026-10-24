/**
 * TEST ONLY (2026-10-16): suggested replies under the friend's last line, from the approved iOS
 * chat prototype. A fixed pool picked by message id; later the model writes two or three that
 * fit the line (see HANDOFF "suggested replies").
 */
const POOL = [
  'Tell me more',
  'Really?',
  'Haha',
  'Why?',
  'And then?',
  "That's sweet",
  'Go on',
  'I missed you',
];

export function suggestedReplies(messageId: string): string[] {
  let hash = 0;
  for (let i = 0; i < messageId.length; i++) hash = (hash * 31 + messageId.charCodeAt(i)) >>> 0;
  const first = hash % POOL.length;
  const second = (first + 1 + (hash >> 4) % (POOL.length - 1)) % POOL.length;
  return [POOL[first], POOL[second]];
}
