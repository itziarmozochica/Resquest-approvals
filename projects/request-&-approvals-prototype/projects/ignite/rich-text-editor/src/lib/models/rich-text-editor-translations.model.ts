export interface IgntRichTextEditorAlignmentMenuTranslations {
  alignCenter?: string;
  alignLeft?: string;
  alignRight?: string;
  menuLabel?: string;
}

export interface IgntRichTextEditorLinkPopoverTranslations {
  applyButton?: string;
  cancelButton?: string;
  dialogLabel?: string;
  invalidUrlError?: string;
  openLink?: string;
  removeButton?: string;
  urlPlaceholder?: string;
}

export interface IgntRichTextEditorToolbarTranslations {
  alignment?: string;
  bulletList?: string;
  clearFormat?: string;
  emoji?: string;
  image?: string;
  imageAlignCenter?: string;
  imageAlignLeft?: string;
  imageAlignRight?: string;
  imageFullWidth?: string;
  link?: string;
  orderedList?: string;
  sourceHtml?: string;
  strike?: string;
  toolbarLabel?: string;
  bold?: (modifier: string) => string;
  italic?: (modifier: string) => string;
  underline?: (modifier: string) => string;
}

export interface IgntRichTextEditorTranslations {
  alignmentMenu?: IgntRichTextEditorAlignmentMenuTranslations;
  linkPopover?: IgntRichTextEditorLinkPopoverTranslations;
  toolbar?: IgntRichTextEditorToolbarTranslations;
}

export type ResolvedIgntRichTextEditorAlignmentMenuTranslations = Required<IgntRichTextEditorAlignmentMenuTranslations>;
export type ResolvedIgntRichTextEditorLinkPopoverTranslations = Required<IgntRichTextEditorLinkPopoverTranslations>;
export type ResolvedIgntRichTextEditorToolbarTranslations = Required<IgntRichTextEditorToolbarTranslations>;

export interface ResolvedIgntRichTextEditorTranslations {
  alignmentMenu: ResolvedIgntRichTextEditorAlignmentMenuTranslations;
  linkPopover: ResolvedIgntRichTextEditorLinkPopoverTranslations;
  toolbar: ResolvedIgntRichTextEditorToolbarTranslations;
}
