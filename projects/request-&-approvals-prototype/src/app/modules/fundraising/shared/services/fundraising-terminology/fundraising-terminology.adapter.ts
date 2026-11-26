import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import {
  FundraisingTerminologyPresetDto,
  FundraisingTerminologySettingsResponseDto,
  FundraisingTerminologyVocabularyDto,
} from './fundraising-terminology.dto';
import {
  FundraisingTerminologyPreset,
  FundraisingTerminologySettings,
  FundraisingTerminologyVocabulary,
} from './fundraising-terminology.model';

@Injectable({
  providedIn: 'root',
})
export class FundraisingTerminologyAdapter implements AdapterInterface<BaseResponse<FundraisingTerminologyPreset[]>> {
  fromApi(response: BaseResponse<FundraisingTerminologyPresetDto[]>): BaseResponse<FundraisingTerminologyPreset[]> {
    return new BaseResponse<FundraisingTerminologyPreset[]>(this.#mapPresets(response?.data), this.#getError(response?.error));
  }

  settingsFromApi(dto: FundraisingTerminologySettingsResponseDto): FundraisingTerminologySettings {
    return {
      preset: dto.preset,
      vocabulary: this.#mapVocabulary(dto.vocabulary),
    };
  }

  #getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  #mapPreset(dto: FundraisingTerminologyPresetDto): FundraisingTerminologyPreset {
    return {
      description: dto.description,
      displayName: dto.display_name,
      key: dto.key,
      vocabulary: this.#mapVocabulary(dto.vocabulary),
    };
  }

  #mapPresets(data: FundraisingTerminologyPresetDto[] | null | undefined): FundraisingTerminologyPreset[] {
    return data?.map(dto => this.#mapPreset(dto)) ?? [];
  }

  #mapVocabulary(data: FundraisingTerminologyVocabularyDto | null | undefined): FundraisingTerminologyVocabulary {
    return data ?? {};
  }
}
