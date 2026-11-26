export interface DistributorGroupPublicationDto {
  failed_count: number;
  group_id: string;
  group_name: string;
  id: string;
  published_count: number | null;
  requested_count: number;
  run_requested_count?: number;
  status: string;
}

export interface DistributorGroupPublicationsDto {
  publications: DistributorGroupPublicationDto[];
}

export interface DistributorGroupPublicationRequestDto {
  plan_ids: number[];
  retry_of?: string;
}

export interface DistributorGroupPublicationFailureDto {
  code: string;
  plan_id: number;
  plan_name: string | null;
  reason: string;
}

export interface DistributorGroupPublicationDetailDto {
  failures: DistributorGroupPublicationFailureDto[];
  group_id: string;
  id: string;
  status: string;
}

export interface DistributorGroupLatestPublicationDto {
  publication: DistributorGroupPublicationDetailDto;
}

export interface DistributorGroupPublicationErrorDto {
  error?: { code?: number | string; message?: string } | null;
}

export interface DistributorGroupPublicationCheckRequestDto {
  plan_ids: number[];
}

export interface DistributorGroupBlockedPlanDto {
  code: string;
  plan_id: number;
  reason: string;
}

export interface DistributorGroupPublicationCheckDto {
  blocked_plans: DistributorGroupBlockedPlanDto[];
}
