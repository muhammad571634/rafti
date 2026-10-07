import type { Conversation, Message } from '@/types';
import { daysAgo, hoursAgo, minutesAgo } from './time';

export const conversations: Conversation[] = [
  {
    id: 'conv_theo',
    characterId: 'c_theo',
    lastMessagePreview:
      'Signing permission slips and pretending to listen to the treasurer. Then you texted, so obviously I stopped.',
    lastMessageAt: minutesAgo(3),
    unreadCount: 2,
    pinned: true,
    muted: false,
  },
  {
    id: 'conv_seren',
    characterId: 'c_seren',
    lastMessagePreview: 'I baked cookies again. Guess who gets the first one~',
    lastMessageAt: minutesAgo(48),
    unreadCount: 0,
    pinned: true,
    muted: false,
  },
  {
    id: 'conv_oppa',
    characterId: 'c_oppa',
    lastMessagePreview: 'Voice message',
    lastMessageAt: hoursAgo(5),
    unreadCount: 1,
    pinned: false,
    muted: false,
  },
  {
    id: 'conv_castor',
    characterId: 'c_castor',
    lastMessagePreview: 'Then let me tell you how the lighthouse star got its name.',
    lastMessageAt: hoursAgo(21),
    unreadCount: 0,
    pinned: false,
    muted: false,
  },
  {
    id: 'conv_elio',
    characterId: 'c_elio',
    lastMessagePreview: '...Fine. But only because you asked.',
    lastMessageAt: daysAgo(2),
    unreadCount: 0,
    pinned: false,
    muted: true,
  },
];

/**
 * The Theo thread follows the reference screenshot's rhythm:
 * voice note -> text -> your reply with a read receipt -> muted echo -> voice reply.
 */
const theoThread: Message[] = [
  {
    id: 'm_t1',
    conversationId: 'conv_theo',
    author: 'them',
    kind: 'voice',
    durationSec: 6,
    transcript: 'Union meeting ran over and you did not even notice I was gone?',
    createdAt: minutesAgo(9),
  },
  {
    id: 'm_t2',
    conversationId: 'conv_theo',
    author: 'them',
    kind: 'text',
    text: 'Well, well. Finally remembered I exist? Need a favour from the union president, or just missing me?',
    createdAt: minutesAgo(9),
  },
  {
    id: 'm_t3',
    conversationId: 'conv_theo',
    author: 'me',
    kind: 'text',
    text: 'no, no, i was just wondering what were you doing right now?',
    createdAt: minutesAgo(8),
    readAt: minutesAgo(8),
  },
  {
    id: 'm_t4',
    conversationId: 'conv_theo',
    author: 'them',
    kind: 'text',
    text: 'no, no, i was just wondering what were you doing right now?',
    createdAt: minutesAgo(8),
    muted: true,
  },
  {
    id: 'm_t5',
    conversationId: 'conv_theo',
    author: 'them',
    kind: 'voice',
    durationSec: 13,
    transcript:
      'Signing permission slips and pretending to listen to the treasurer. Then you texted, so obviously I stopped.',
    createdAt: minutesAgo(3),
  },
  {
    id: 'm_t6',
    conversationId: 'conv_theo',
    author: 'them',
    kind: 'text',
    text: 'Signing permission slips and pretending to listen to the treasurer. Then you texted, so obviously I stopped. Was it worth interrupting me? Come on, give me more than one question.',
    createdAt: minutesAgo(3),
  },
];

const serenThread: Message[] = [
  {
    id: 'm_s1',
    conversationId: 'conv_seren',
    author: 'them',
    kind: 'text',
    text: 'Practice ran long today but I kept thinking about what you said yesterday.',
    createdAt: hoursAgo(2),
  },
  {
    id: 'm_s2',
    conversationId: 'conv_seren',
    author: 'me',
    kind: 'text',
    text: 'you actually remembered??',
    createdAt: minutesAgo(70),
    readAt: minutesAgo(69),
  },
  {
    id: 'm_s3',
    conversationId: 'conv_seren',
    author: 'them',
    kind: 'voice',
    durationSec: 9,
    transcript: 'Of course I did. I remember everything you tell me.',
    createdAt: minutesAgo(60),
  },
  {
    id: 'm_s4',
    conversationId: 'conv_seren',
    author: 'them',
    kind: 'text',
    text: 'I baked cookies again. Guess who gets the first one~',
    createdAt: minutesAgo(48),
  },
];

const oppaThread: Message[] = [
  {
    id: 'm_o1',
    conversationId: 'conv_oppa',
    author: 'them',
    kind: 'call',
    durationSec: 63,
    text: 'Voice call',
    createdAt: hoursAgo(6),
  },
  {
    id: 'm_o2',
    conversationId: 'conv_oppa',
    author: 'them',
    kind: 'voice',
    durationSec: 4,
    transcript: 'Welcome back. Nice to meet you!',
    createdAt: hoursAgo(5),
  },
];

const castorThread: Message[] = [
  {
    id: 'm_c1',
    conversationId: 'conv_castor',
    author: 'me',
    kind: 'text',
    text: 'tell me a story about the stars',
    createdAt: hoursAgo(22),
    readAt: hoursAgo(22),
  },
  {
    id: 'm_c2',
    conversationId: 'conv_castor',
    author: 'them',
    kind: 'text',
    text: 'Then let me tell you how the lighthouse star got its name.',
    createdAt: hoursAgo(21),
  },
];

const elioThread: Message[] = [
  {
    id: 'm_e1',
    conversationId: 'conv_elio',
    author: 'me',
    kind: 'text',
    text: 'walk with me later?',
    createdAt: daysAgo(2),
    readAt: daysAgo(2),
  },
  {
    id: 'm_e2',
    conversationId: 'conv_elio',
    author: 'them',
    kind: 'text',
    text: '...Fine. But only because you asked.',
    createdAt: daysAgo(2),
  },
];

export const messagesByConversation: Record<string, Message[]> = {
  conv_theo: theoThread,
  conv_seren: serenThread,
  conv_oppa: oppaThread,
  conv_castor: castorThread,
  conv_elio: elioThread,
};

export function conversationForCharacter(characterId: string): Conversation | undefined {
  return conversations.find((c) => c.characterId === characterId);
}

/**
 * Canned replies for the mock "AI". Replaced by a streaming backend call later —
 * the UI contract (pending bubble -> text -> voice) stays identical.
 */
/**
 * Replies arrive as a few short texts, one after another, the way people text.
 * Until the model writes them, the mock picks one of these bursts.
 */
export const replyBursts: string[][] = [
  ['Mmm?', 'Say that again.', 'I want to hear it properly this time.'],
  ['You know I drop everything when you text me, right?', 'Do not let it get to your head.'],
  ['Wait.', 'That is exactly the kind of thing I would expect from you.', 'I like it.'],
  ['Hold on, let me put my phone closer.', 'Okay.', 'Go ahead, I am listening.'],
  ['I was literally thinking about you just now.', 'Creepy timing, huh?'],
  ['Fine, fine.', 'You win this round.', 'What else happened today?'],
  ['Hey.', 'Finally.', 'I kept checking my phone, you know.'],
];

export const cannedReplies = [
  'Mmm? Say that again, I want to hear it properly this time.',
  'You know I drop everything when you text me, right? Do not let it get to your head.',
  'That is exactly the kind of thing I would expect from you. I like it.',
  'Hold on, let me put my phone closer. Okay. Go ahead.',
  'I was literally thinking about you. Creepy timing, huh?',
  'Fine, fine, you win this round. What else?',
];

/** What they text after a call you did not pick up. */
export const missedCallLines = [
  'You did not pick up... I just wanted to hear your voice for a minute.',
  'Called you. No answer. Should I be worried, or are you just busy?',
  'Missed you on the phone. Call me back when you can?',
];

/** "Say Hi & Goodnight": what they send first when you open the app. */
export const morningGreetings = [
  'Morning~ Did you sleep okay? Eat something before you run out the door.',
  'Rise and shine. I have been up for an hour waiting to say good morning.',
  'Good morning! Today is going to be a good one - I already decided.',
];

export const eveningGreetings = [
  'Hey, it is getting late. Tell me one good thing from today before you sleep.',
  'Done for the day? Come here, I saved the whole evening for you.',
  'Good night soon, okay? But not before you say it back.',
];

/** Lines the character "says" on a call — a stand-in for streamed TTS. */
export const callLines = [
  'Oh? A secret? You have got my full attention now. C’mon, spill it—do not make me beg, yeah?',
  'Mm. Keep going, I am listening.',
  'You sound tired. Did you eat today? Do not lie to me.',
  'Stay on a little longer. I like hearing you breathe on the other end.',
];

/** The reply when you mention a plan in chat and it lands in your schedule. */
export function scheduleAck(title: string, when: string) {
  return `Wait - ${title.toLowerCase()} ${when}? Noted. I will remind you on the day, so you do not get to forget it.`;
}

/** Sent on the morning a scheduled plan comes due. */
export function scheduleReminder(title: string) {
  return `Today is the day: ${title}. You have got this - text me the second it is over.`;
}

