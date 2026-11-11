const MIN_DISTANCE = 56;
const MAX_MS = 600;

/**
 * Which way a finger moved the tabs: -1 to the previous one, 1 to the next, 0 for nothing. Only a quick, mostly
 * sideways stroke counts, so scrolling the page up and down never changes tab, and the first and last tab do not wrap.
 */
export function swipeStep(dx: number, dy: number, ms: number, index: number, count: number): -1 | 0 | 1 {
  if (ms > MAX_MS || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  const step = dx < 0 ? 1 : -1;
  const target = index + step;
  return target < 0 || target >= count ? 0 : step;
}
