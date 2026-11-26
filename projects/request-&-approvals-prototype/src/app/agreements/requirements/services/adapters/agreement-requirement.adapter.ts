import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { CoverageRule } from '../../enums/coverage-rule.enum';
import { SignerRole } from '../../enums/signer-role.enum';
import { AgreementRequirement } from '../../models/agreement-requirement.model';
import { LocalizedText } from '../../models/localized-text.model';
import { NewRequirement } from '../../models/new-requirement.model';
import { RequirementPatch } from '../../models/requirement-patch.model';
import { AgreementRequirementDto } from '../dtos/agreement-requirement.dto';
import { CreateAgreementRequirementRequestDto } from '../dtos/create-agreement-requirement-request.dto';
import { PatchAgreementRequirementRequestDto } from '../dtos/patch-agreement-requirement-request.dto';
import { TranslationsDto } from '../dtos/translations.dto';

@Injectable({ providedIn: 'root' })
export class AgreementRequirementAdapter implements AdapterInterface<AgreementRequirement, AgreementRequirementDto> {
  fromApi(dto: AgreementRequirementDto): AgreementRequirement {
    return {
      active: dto.active,
      agreementId: dto.agreement_id,
      coverageRule: dto.coverage_rule as CoverageRule,
      createdAt: dto.created_at,
      id: dto.id,
      mainPlanId: dto.main_plan_id,
      scope: dto.session_type_id == null ? { kind: 'plan' } : { kind: 'ticketType', sessionTypeId: dto.session_type_id },
      signerRole: dto.signer_role as SignerRole,
      translations: this.#mapTranslations(dto.translations),
      updatedAt: dto.updated_at,
    };
  }

  toActiveDto(active: boolean): PatchAgreementRequirementRequestDto {
    return { active };
  }

  toCreateDto(input: NewRequirement): CreateAgreementRequirementRequestDto {
    return {
      active: true,
      agreement_id: input.agreementId,
      coverage_rule: input.coverageRule,
      main_plan_id: input.mainPlanId,
      session_type_id: input.sessionTypeId,
      signer_role: input.signerRole,
      translations: this.#mapTranslations(input.translations),
    };
  }

  toPatchDto(patch: RequirementPatch): PatchAgreementRequirementRequestDto {
    const dto: PatchAgreementRequirementRequestDto = {};
    if (patch.active !== undefined) {
      dto.active = patch.active;
    }
    if (patch.signerRole !== undefined) {
      dto.signer_role = patch.signerRole;
    }
    if (patch.translations !== undefined) {
      dto.translations = this.#mapTranslations(patch.translations);
    }
    return dto;
  }

  #mapTranslations(translations: AgreementRequirementDto['translations'] | LocalizedText): LocalizedText & TranslationsDto {
    const result: LocalizedText & TranslationsDto = {};
    for (const [locale, value] of Object.entries(translations)) {
      result[locale] = value.description == null ? { title: value.title } : { description: value.description, title: value.title };
    }
    return result;
  }
}
