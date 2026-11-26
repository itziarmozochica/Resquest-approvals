import type { IgntIconName } from '@ignite/icon';

export type ImmersiveMarkdownFormat = 'bold' | 'bulletList' | 'italic' | 'orderedList';

export interface ImmersiveMarkdownToolbarItem {
  readonly format: ImmersiveMarkdownFormat;
  readonly icon: IgntIconName;
  readonly labelKey: string;
}

// Set on the transaction that loads stored text into the editor; the guardrail then skips its emoji net and moves the baseline.
export const IMMERSIVE_MARKDOWN_LOAD_META = 'immersiveMarkdownLoad';

export const IMMERSIVE_MARKDOWN_TOOLBAR_ITEMS: readonly ImmersiveMarkdownToolbarItem[] = [
  { format: 'bold', icon: 'bold', labelKey: 'planEdition.immersiveContentPlan.markdownEditor.bold' },
  { format: 'italic', icon: 'italic', labelKey: 'planEdition.immersiveContentPlan.markdownEditor.italic' },
  { format: 'bulletList', icon: 'list-ul', labelKey: 'planEdition.immersiveContentPlan.markdownEditor.bulletList' },
  { format: 'orderedList', icon: 'list-ol', labelKey: 'planEdition.immersiveContentPlan.markdownEditor.orderedList' },
];
