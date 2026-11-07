/** Where people are measured in feet and inches. */
const IMPERIAL = /-(US|LR|MM)$/i;

/** Height as people read it where they live: 6′0″ in the US, 184 cm elsewhere. */
export function heightLabel(cm: number, locale: string) {
  if (!IMPERIAL.test(locale)) return `${cm} cm`;
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}
