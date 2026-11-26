import type { AgreementPolicyDto } from './agreement-policy.dto';
import type { AgreementVersionDetailDto } from './agreement-version.dto';

export interface AgreementResourceDto {
  agreement_type: string;
  created_at: string;
  id: string;
  name: string;
  partner_id: number;
  status: string;
  updated_at: string;
}

export interface AgreementResourceListDto {
  has_more: boolean;
  items: AgreementResourceDto[];
  limit: number;
  offset: number;
}

export interface AgreementDetailResourceDto extends AgreementResourceDto {
  current_version: AgreementVersionDetailDto | null;
  policy: AgreementPolicyDto | null;
}

export interface AgreementDraftUpdateInputDto {
  agreement_type: string;
  name: string;
}

export interface AgreementResourceInputDto {
  agreement_type: string;
  name: string;
}
