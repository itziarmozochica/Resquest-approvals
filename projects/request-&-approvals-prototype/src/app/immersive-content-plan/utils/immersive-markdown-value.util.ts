import { canonicaliseDescriptionMarkdown } from './immersive-description-markdown.util';

export interface MarkdownValueState {
  readonly canonicalOriginal: string;
  readonly current: string;
  readonly original: string;
}

export interface MarkdownEmission {
  readonly emit: string | null;
  readonly state: MarkdownValueState;
}

export function createMarkdownValueState(value: string): MarkdownValueState {
  return { canonicalOriginal: canonicaliseDescriptionMarkdown(value), current: value, original: value };
}

// Content equal to what the stored string reads as is the stored string again, so an edit that is undone restores its bytes.
export function resolveMarkdownEmission(state: MarkdownValueState, serialized: string): MarkdownEmission {
  const value = serialized === state.canonicalOriginal ? state.original : serialized;
  return value === state.current ? { emit: null, state } : { emit: value, state: { ...state, current: value } };
}
