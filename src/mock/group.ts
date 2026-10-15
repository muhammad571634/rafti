/**
 * Canned lines for group chats until the model writes them (buildGroupPrompt in
 * src/ai/rules.ts). Short, as people text in a group; the user stays the one they talk to.
 */

/** A member's answer to the user, one or two texts. */
export const groupReplies: string[][] = [
  ['Okay, I am in.'],
  ['Wait, say that again.', 'Slowly this time.'],
  ['Ha. I knew you would say that.'],
  ['You always do this to me.', 'I love it.'],
  ['Hold on, I am reading this twice.'],
  ['Honestly? Best thing anyone said today.'],
  ['Tell us everything. From the start.'],
  ['Hmm. Give me a second to think about it.', 'Okay, yes.'],
];

/** A second member joins in, talking to the first by name. */
export const groupReactions: ((name: string) => string)[] = [
  (name) => `${name} is right, for once.`,
  (name) => `Do not listen to ${name}. Listen to me.`,
  (name) => `${name}, let them finish!`,
  (name) => `Same as ${name}. But louder.`,
  (name) => `${name} says that every single time.`,
  (name) => `Okay, ${name} wins this one.`,
];

/** The first line in a new group, from its first member, naming the others. */
export const groupHellos: ((others: string) => string)[] = [
  (others) => `Wait, ${others} too? Okay, this is going to be fun.`,
  (others) => `A group chat? Fine. Hi, ${others}.`,
  (others) => `Oh, ${others}! I finally get to talk to you properly.`,
];

/** A member who was just added says hello. */
export const groupJoinLines = [
  'Hi everyone. Did I miss anything good?',
  'I am here! What are we talking about?',
  'Okay, I made it. Catch me up.',
];

export const groupPhotoLines = [
  'Okay, who took this? It is really good.',
  'Send it to me too. Right now.',
  'I am looking at this way longer than I should.',
];

export const groupVoiceLines = [
  'I listened to it twice.',
  'Your voice in here is the best part of the chat.',
  'Say that again, I want to hear it properly.',
];
