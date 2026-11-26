export interface AgreementVersionDto {
  agreement_id: string;
  content_hash: string;
  created_at: string;
  id: string;
  prior_acceptance_valid: boolean;
  supersedes_version_id: string | null;
  version: number;
}

export interface AgreementVersionDetailDto extends AgreementVersionDto {
  content: string;
}

export interface AgreementVersionListResultDto {
  has_more: boolean;
  items: AgreementVersionDto[];
  limit: number;
  offset: number;
}

export interface AgreementVersionInputDto {
  content: string;
  prior_acceptance_valid: boolean;
}
