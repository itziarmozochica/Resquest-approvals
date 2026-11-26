export interface UnvalidateCodesResponseData {
  not_unvalidated_code_ids?: number[];
  partial: boolean;
  skipped_not_validated_codes?: string[];
  unvalidated_code_ids: number[];
}

export interface UnvalidateCodesApiBody {
  data: UnvalidateCodesResponseData;
  error: null;
}
