/**
 * Group chats: the user and 2 or 3 characters in one chat (queue item 16). Pure and
 * server-portable: the app's mock replies and the backend pick who answers the same way.
 */

export const GROUP_MIN = 2;
export const GROUP_MAX = 3;

/** "Kai & Theo", "Kai, Theo & Hana". */
export function groupTitle(names: string[]) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** Members named in the text, in the order they are named ("Hana, ask Kai" -> Hana, Kai). */
export function namedMembers(text: string, names: Record<string, string>) {
  const lower = text.toLowerCase();
  return Object.entries(names)
    .map(([id, name]) => {
      const word = name.trim().toLowerCase();
      if (!word) return { id, at: -1 };
      // A whole word only: "Kai" is named in "kai, wait" but not in "kaiju".
      const match = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, 'u').exec(lower);
      return { id, at: match ? match.index + match[1].length : -1 };
    })
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((m) => m.id);
}

/** The member who spoke least recently (never first), ties going to the member order. */
export function leastRecent(memberIds: string[], speakers: string[]) {
  let best: string | undefined;
  let bestAt = Infinity;
  for (const id of memberIds) {
    const at = speakers.lastIndexOf(id);
    if (at < bestAt) {
      best = id;
      bestAt = at;
    }
  }
  return best;
}

/**
 * Who answers a message, in order. A member named in it answers first (two named: both);
 * otherwise the one who spoke least recently. On every other message (`turn` odd) a second
 * member joins in, so the chat feels like a group without everyone answering everything.
 * `speakers` are the members' earlier messages, oldest first.
 */
export function pickResponders(
  memberIds: string[],
  names: Record<string, string>,
  text: string,
  speakers: string[],
  turn: number,
): string[] {
  const members = memberIds.filter((id) => id in names);
  if (!members.length) return [];
  const named = namedMembers(text, Object.fromEntries(members.map((id) => [id, names[id]])));
  if (named.length >= 2) return named.slice(0, 2);
  const first = named[0] ?? leastRecent(members, speakers)!;
  if (turn % 2 === 0 || members.length < 2) return [first];
  const second = leastRecent(
    members.filter((id) => id !== first),
    speakers,
  );
  return second ? [first, second] : [first];
}

/**
 * Who talks when the user taps Continue in a group (they go on without the user writing): the
 * member who spoke least recently answers the one who spoke last, and that one answers back, so
 * two trade a line each, as in a stream. In a group of three the third has the next turn.
 */
export function continueSpeakers(memberIds: string[], speakers: string[]): string[] {
  const last = speakers[speakers.length - 1];
  const first = leastRecent(
    memberIds.filter((id) => id !== last),
    speakers,
  );
  if (!first) return [];
  return last && memberIds.includes(last) ? [first, last] : [first];
}

/** A member can be added while there is room, and removed while two would stay. */
export const canAddMember = (memberIds: string[]) => memberIds.length < GROUP_MAX;
export const canRemoveMember = (memberIds: string[]) => memberIds.length > GROUP_MIN;

/**
 * A character leaves every group they were in (blocked or removed). A group left with fewer
 * than two members ends: `null` means delete it.
 */
export function withoutMember(memberIds: string[], characterId: string): string[] | null {
  const rest = memberIds.filter((id) => id !== characterId);
  return rest.length >= GROUP_MIN ? rest : null;
}

/** "Kai: See you there" — the chats list preview of a member's line. */
export function groupPreview(senderName: string | undefined, text: string) {
  return senderName ? `${senderName}: ${text}` : text;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
