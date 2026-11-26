export type KioskLanguage = {
  id: string;
  label: string;
};

export type KioskLanguageModalData = {
  languages: KioskLanguage[];
  selected: KioskLanguage;
};
