let pickerElementDefinition: Promise<unknown> | null = null;

export function loadEmojiPickerElement(): void {
  pickerElementDefinition ??= import('emoji-picker-element/picker').catch(() => {
    // A failed chunk fetch must not surface as an unhandled rejection, and clearing the memo
    // lets the next mount retry instead of reusing the rejected promise.
    pickerElementDefinition = null;
  });
}
