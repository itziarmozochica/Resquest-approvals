export interface BulkUploadPreviewDTO {
  preview_results: Record<
    string,
    {
      existing_codes: string[];
      new_codes: string[];
      repeated_codes: string[];
      summary: {
        total_existing: number;
        total_new: number;
        total_repeated: number;
        total_in_file: number;
      };
    }
  >;
  session_map?: Record<
    string,
    {
      session_type_label: string;
      starts_at: string;
    }
  >;
  repeated_codes: string[];
  sessions_with_access_control_records: number[];
  sessions_not_int: string[];
  sessions_not_found: number[];
  sessions_not_belong_to_partner: number[];
  sessions_not_belong_to_main_plan: number[];
}
