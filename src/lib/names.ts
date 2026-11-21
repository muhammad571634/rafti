const TITLES = new Set(['prince', 'princess', 'lord', 'lady', 'sir', 'dr', 'dr.', 'commander', 'captain', 'king', 'queen']);

/** What a friend is called in a sentence: "Prince Aurelian" -> "Aurelian", "Kai Arden" -> "Kai". */
export function shortName(name: string) {
  const words = name.trim().split(/\s+/);
  while (words.length > 1 && TITLES.has(words[0].toLowerCase())) words.shift();
  return words[0] ?? name;
}
