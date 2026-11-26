// What the field row hands the panel: enough to name the field and to write its token, nothing the
// panel can read from the store itself.
export interface ImmersiveFieldTranslationsPanelData {
  fieldLabelKey: string;
  isSwitchable: boolean;
  itemTitle: string | null;
  moduleId: string;
  moduleLabel: string;
  multiline: boolean;
  richText: boolean;
  token: string;
}

export interface TranslationRowView {
  code: string;
  dirty: boolean;
  inputId: string;
  isBase: boolean;
  label: string;
  missing: boolean;
  text: string;
}
