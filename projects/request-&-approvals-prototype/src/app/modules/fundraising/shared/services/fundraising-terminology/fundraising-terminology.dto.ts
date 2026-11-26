export type FundraisingTerminologyVocabularyDto = Record<string, string>;

export interface FundraisingTerminologyPresetDto {
  description: string;
  display_name: string;
  key: string;
  vocabulary: FundraisingTerminologyVocabularyDto;
}

export interface FundraisingTerminologyPresetsResponseDto {
  presets: FundraisingTerminologyPresetDto[];
}

export interface FundraisingTerminologySettingsResponseDto {
  preset: string;
  vocabulary: FundraisingTerminologyVocabularyDto;
}

export interface UpdateFundraisingTerminologySettingsDto {
  preset: string;
}
