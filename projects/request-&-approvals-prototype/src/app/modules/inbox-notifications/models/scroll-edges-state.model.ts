export interface ScrollEdgesState {
  readonly atTop: boolean;
  readonly moreBelow: boolean;
}

export const RESTING_SCROLL_EDGES: ScrollEdgesState = { atTop: true, moreBelow: false };
