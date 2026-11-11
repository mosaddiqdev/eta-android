/**
 * When each idle worker went idle, as far as it can be known. A worker that is idle because its upgrade finished since
 * the export went idle at that finish time. One that was already idle at export time left no trace, so it gets null.
 * The oldest finish goes to the first idle worker, so the list reads longest-idle first.
 */
export function idleSince(finishedAt: number[], idle: number): (number | null)[] {
  const oldestFirst = [...finishedAt].sort((a, b) => a - b);
  return Array.from({ length: Math.max(0, idle) }, (_, i) => oldestFirst[i] ?? null);
}
