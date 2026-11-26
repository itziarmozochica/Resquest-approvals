export interface EmojiRange {
  readonly from: number;
  readonly to: number;
}

// Every code point is an ASCII `\u{...}` escape in the regex source, never a literal character. The base is `\p{Emoji}`
// minus ASCII and `\p{Emoji_Component}`: unlike `\p{Extended_Pictographic}`, which Unicode 17 shrank by 689 symbols
// such as the star, it classifies the same characters on every runtime, so the editor strips the same text in any browser.
// The four hair pictographs (U+1F9B0 to U+1F9B3) are `Emoji_Component` too, so they are added back, alone or ZWJ-joined.
const EMOJI_SOURCE = String.raw`[\u{1F1E6}-\u{1F1FF}]{1,2}|[0-9#*]\u{FE0F}?\u{20E3}|(?![\u{A9}\u{AE}\u{2122}](?!\u{FE0F}))(?:[\u{1F9B0}-\u{1F9B3}]|(?![\u{0}-\u{7F}]|\p{Emoji_Component})\p{Emoji})(?:\u{FE0E}|\u{FE0F})?\p{Emoji_Modifier}?[\u{E0020}-\u{E007F}]*(?:\u{200D}(?:[\u{1F9B0}-\u{1F9B3}]|(?![\u{0}-\u{7F}]|\p{Emoji_Component})\p{Emoji})(?:\u{FE0E}|\u{FE0F})?\p{Emoji_Modifier}?)*\u{200D}?|\u{FE0F}|\u{20E3}|\p{Emoji_Modifier}|[\u{E0020}-\u{E007F}]`;
const EMOJI_PATTERN = new RegExp(EMOJI_SOURCE, 'gu');

export function stripEmoji(text: string): string {
  return text.replace(EMOJI_PATTERN, '');
}

// `matchAll()` clones the global pattern, so its shared `lastIndex` never leaks between calls.
export function findEmojiRanges(text: string): EmojiRange[] {
  return Array.from(text.matchAll(EMOJI_PATTERN), (match: RegExpMatchArray) => {
    const from = match.index ?? 0;
    return { from, to: from + match[0].length };
  });
}
