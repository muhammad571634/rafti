import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';
import type { WorldNews } from '../lib/world-story';
import type { CharacterGender } from '../types';

/**
 * The stand-in for a friend bringing up their world or their own story, when the model is off.
 * The real words come from the server (`worldNewsParts`, `arcLines`).
 */
export const WORLD_VOICE = {
  chapter: ['Did you hear? {note}', 'You are not going to believe this. {note}', 'So. {note} I keep thinking about it.'],
  arc: ['There is something I have not told you. {title}.', 'Can I tell you something? {title}. That is all I will say for now.'],
};

/** What they text about a chapter or an event: the event's own line, or the chapter's beat in a frame. */
export function worldNewsLine(news: Pick<WorldNews, 'key' | 'note' | 'line'>, gender: CharacterGender | undefined) {
  if (news.line) return fill(news.line, {}, gender);
  return fill(pickSeeded(voice('world', WORLD_VOICE).chapter, news.key), { note: news.note }, gender);
}

/** The line a beat that has just opened adds to a stand-in reply. */
export const arcLine = (title: string, seed: string, gender: CharacterGender | undefined) =>
  fill(pickSeeded(voice('world', WORLD_VOICE).arc, seed), { title }, gender);
