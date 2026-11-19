import { STORY_STATES, type StoryState } from './types';

const INDEX = Object.fromEntries(
  STORY_STATES.map((s, i) => [s, i]),
) as Record<StoryState, number>;

/**
 * Legal transitions:
 * - stay on current state
 * - advance exactly one step forward
 * - mild backtrack: go back at most one step (never below 初识)
 *
 * Illegal: skip ahead (e.g. 初识 → 试炼) or jump back more than one.
 */
export function isLegalTransition(
  current: StoryState,
  next: StoryState,
): boolean {
  const cur = INDEX[current];
  const nxt = INDEX[next];
  if (cur === undefined || nxt === undefined) return false;
  const delta = nxt - cur;
  return delta === 0 || delta === 1 || delta === -1;
}

/** Clamp an LLM-proposed state into a legal transition from `current`. */
export function sanitizeTransition(
  current: StoryState,
  proposed: StoryState | string | undefined,
): StoryState {
  if (
    typeof proposed === 'string' &&
    (STORY_STATES as readonly string[]).includes(proposed) &&
    isLegalTransition(current, proposed as StoryState)
  ) {
    return proposed as StoryState;
  }
  return current;
}

export function stateIndex(state: StoryState): number {
  return INDEX[state];
}

export function nextForwardState(state: StoryState): StoryState | null {
  const i = INDEX[state];
  if (i >= STORY_STATES.length - 1) return null;
  return STORY_STATES[i + 1];
}

export const STATE_MEANINGS: Record<StoryState, string> = {
  初识: '初遇仙人，互道名号，探问来意。',
  问道: '请教仙法、因果与修行之道。',
  试炼: '仙人以言或事试心，察你根器。',
  结缘: '心意相通，结下仙缘，可得指点。',
  降妖: '携仙缘共赴妖患，以道御魔。',
};
