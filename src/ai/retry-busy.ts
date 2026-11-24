/**
 * One more try when the server was busy (0z338, audit #1): the free model key often answers 503
 * "high demand" within a second or two, and the next try a few seconds later gets through. Only a
 * quick, transient failure is tried again: a timeout has already kept the user waiting, and a refusal
 * (402 no shells, 4xx) would only fail the same way.
 */
export type Attempt<T> = { value: T | null; transient: boolean };

/** Past this the first try was slow (a timeout or close to it), so the user has waited enough. */
export const RETRY_IF_FAILED_WITHIN_MS = 15_000;
/** How long to wait before the second try: long enough for a busy spike to pass. */
export const RETRY_AFTER_MS = 8_000;

export async function retryBusy<T>(
  attempt: () => Promise<Attempt<T>>,
  options: { now?: () => number; wait?: (ms: number) => Promise<void> } = {},
): Promise<T | null> {
  const now = options.now ?? Date.now;
  const wait = options.wait ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const started = now();
  const first = await attempt();
  if (first.value != null || !first.transient || now() - started > RETRY_IF_FAILED_WITHIN_MS) return first.value;
  await wait(RETRY_AFTER_MS);
  return (await attempt()).value;
}

/** A status worth trying again: too many requests, or the server or its model busy. */
export function isTransientStatus(status: number) {
  return status === 429 || status >= 500;
}
