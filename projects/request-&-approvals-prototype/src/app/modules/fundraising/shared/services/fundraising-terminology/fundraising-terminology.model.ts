export type FundraisingTerminologyVocabulary = Record<string, string>;

export interface FundraisingTerminologyPreset {
  description: string;
  displayName: string;
  key: string;
  vocabulary: FundraisingTerminologyVocabulary;
}

export interface FundraisingTerminologySettings {
  preset: string;
  vocabulary: FundraisingTerminologyVocabulary;
}
