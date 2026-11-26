export interface BulkUploadPreview {
  previewResults: Record<
    string,
    {
      existingCodes: string[];
      newCodes: string[];
      repeatedCodes: string[];
      summary: {
        totalExisting: number;
        totalNew: number;
        totalRepeated: number;
        totalInFile: number;
      };
    }
  >;
  sessionMap?: Record<
    string,
    {
      sessionType: string;
      timeslot: string;
    }
  >;
  repeatedCodes: string[];
  sessionsWithAccessControlRecords: number[];
  sessionsNotInt: string[];
  sessionsNotFound: number[];
  sessionsNotBelongToPartner: number[];
  sessionsNotBelongToMainPlan: number[];
}
