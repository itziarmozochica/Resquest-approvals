export interface AgreementRequirementDto {
  active: boolean;
  agreement_id: string;
  coverage_rule: string;
  created_at: string;
  id: number;
  main_plan_id: number;
  session_type_id: number | null;
  signer_role: string;
  translations: Record<string, { title: string; description?: string | null }>;
  updated_at: string;
}
