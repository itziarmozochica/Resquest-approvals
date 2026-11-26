import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { AgreementStatus } from '../../enums/agreement-status.enum';
import { AgreementType } from '../../enums/agreement-type.enum';
import { PolicyStatus } from '../../enums/policy-status.enum';
import { AcceptancePolicy } from '../../models/acceptance-policy.model';
import {
  CreateAgreementPayload,
  PublishVersionPayload,
  SavePolicyPayload,
  UpdateAgreementPayload,
} from '../../models/agreement-payloads.model';
import { AgreementVersion } from '../../models/agreement-version.model';
import { Agreement } from '../../models/agreement.model';
import { toOffsetDateTime } from '../../utils/agreement-datetime.util';
import { parseEnum } from '../../utils/agreement-enum.util';
import { AgreementPolicyDto, AgreementPolicyInputDto } from '../dtos/agreement-policy.dto';
import {
  AgreementDetailResourceDto,
  AgreementDraftUpdateInputDto,
  AgreementResourceDto,
  AgreementResourceInputDto,
} from '../dtos/agreement-resource.dto';
import { AgreementVersionDetailDto, AgreementVersionDto, AgreementVersionInputDto } from '../dtos/agreement-version.dto';

@Injectable({ providedIn: 'root' })
export class AgreementsAdapter implements AdapterInterface<Agreement, AgreementResourceDto> {
  fromApi(dto: AgreementResourceDto): Agreement {
    return {
      agreementType: parseEnum(AgreementType, dto.agreement_type, 'agreement_type'),
      createdAt: dto.created_at,
      id: dto.id,
      name: dto.name,
      partnerId: String(dto.partner_id),
      policy: null,
      status: parseEnum(AgreementStatus, dto.status, 'status'),
      updatedAt: dto.updated_at,
      versions: [],
    };
  }

  fromDetailApi(dto: AgreementDetailResourceDto): Agreement {
    const currentVersion = dto.current_version;
    return {
      ...this.fromApi(dto),
      policy: dto.policy === null ? null : this.fromPolicyApi(dto.policy),
      versions: currentVersion === null ? [] : [this.fromVersionDetailApi(currentVersion)],
    };
  }

  fromPolicyApi(dto: AgreementPolicyDto): AcceptancePolicy {
    return {
      agreementId: dto.agreement_id,
      createdAt: dto.created_at,
      crossPartnerReuseAllowed: dto.cross_partner_reuse_allowed,
      effectiveFrom: dto.effective_from,
      effectiveUntil: dto.effective_until,
      expiresAfterDays: dto.expires_after_days,
      groupAcceptanceAllowed: dto.group_acceptance_allowed,
      guardianAcceptanceAllowed: dto.guardian_acceptance_allowed,
      id: dto.id,
      status: parseEnum(PolicyStatus, dto.status, 'policy.status'),
      updatedAt: dto.updated_at,
    };
  }

  fromVersionApi(dto: AgreementVersionDto, content: string | null): AgreementVersion {
    return {
      agreementId: dto.agreement_id,
      content,
      contentHash: dto.content_hash,
      createdAt: dto.created_at,
      id: dto.id,
      priorAcceptanceValid: dto.prior_acceptance_valid,
      supersedesVersionId: dto.supersedes_version_id,
      version: dto.version,
    };
  }

  fromVersionDetailApi(dto: AgreementVersionDetailDto): AgreementVersion {
    return this.fromVersionApi(dto, dto.content);
  }

  toCreateDto(payload: CreateAgreementPayload): AgreementResourceInputDto {
    return {
      agreement_type: payload.agreementType,
      name: payload.name,
    };
  }

  toDraftUpdateDto(payload: UpdateAgreementPayload): AgreementDraftUpdateInputDto {
    return {
      agreement_type: payload.agreementType,
      name: payload.name,
    };
  }

  toPolicyDto(payload: SavePolicyPayload): AgreementPolicyInputDto {
    return {
      cross_partner_reuse_allowed: payload.crossPartnerReuseAllowed,
      effective_from: toOffsetDateTime(payload.effectiveFrom),
      effective_until: toOffsetDateTime(payload.effectiveUntil),
      expires_after_days: payload.expiresAfterDays,
      group_acceptance_allowed: payload.groupAcceptanceAllowed,
      guardian_acceptance_allowed: payload.guardianAcceptanceAllowed,
      status: payload.status,
    };
  }

  toVersionDto(payload: PublishVersionPayload): AgreementVersionInputDto {
    return {
      content: payload.content,
      prior_acceptance_valid: payload.priorAcceptanceValid,
    };
  }
}
