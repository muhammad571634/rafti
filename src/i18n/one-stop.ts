/**
 * A sentence that ends on an abbreviated date ("… am {{date}}." with "8. Dez.") would end on two
 * stops. One rule for every string and language: exactly two stops become one; "..." stays.
 */
export const endOneStop = (text: string) => text.replace(/\.{2,}/g, (dots) => (dots.length === 2 ? '.' : dots));
