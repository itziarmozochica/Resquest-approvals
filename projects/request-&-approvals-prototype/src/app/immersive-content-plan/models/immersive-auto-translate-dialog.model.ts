import type { AutoTranslateMode } from './immersive-layout-translation.model';

export interface ImmersiveAutoTranslateDialogData {
  filledCount: number;
  totalCount: number;
}

export type ImmersiveAutoTranslateDialogResult = AutoTranslateMode | false;
