export interface ShiftResult {
  faceFilePath: string;
  name: string;
  value: number;
  maxCount: number;
  percentage: number;
}

export interface ShiftSurveysUI {
  totalCount: number;
  overallReactionFaceFilePath: string;
  results: ShiftResult[];
}
