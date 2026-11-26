const emojiPickerDataPath = 'assets/ignite/emoji-picker/data.json';

export function resolveEmojiPickerDataSource(baseUri: string): string {
  return new URL(emojiPickerDataPath, baseUri).toString();
}
