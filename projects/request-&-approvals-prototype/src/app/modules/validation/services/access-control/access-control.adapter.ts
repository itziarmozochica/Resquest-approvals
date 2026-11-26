import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import {
  AccessControlProfile,
  AccessControlProfileData,
  AccessControlSetup,
  AccessControlSetupData,
} from '../../../../shared/models/access-control/access-control.model';
import { BaseResponse } from '../../../../shared/models/base-response';
import { ValidationResponse, ValidationResponseError } from '../../models/validation-response.model';
import { ERROR_CODES } from './access-control.constants';

interface ValidationApiProfile {
  id: string;
  name: string;
}

interface ValidationApiWarning {
  extra?: { profiles?: ValidationApiProfile[] };
}

interface ValidationApiError {
  code?: number;
  validation_warnings?: ValidationApiWarning[];
}

@Injectable({
  providedIn: 'root',
})
export class AccessControlAdapter implements AdapterInterface<ValidationResponse> {
  fromApi(response: any): ValidationResponse {
    return {
      code: response.code,
      error: this.#getError(response?.error),
      profilesToSelect: this.#getProfilesToSelect(response?.error),
      validated: !response?.error,
    };
  }

  fromApiProfiles(response: BaseResponse<AccessControlProfileData[]>): BaseResponse<AccessControlProfile[] | null> {
    if (!response.data) {
      return new BaseResponse<AccessControlProfile[] | null>(null, response.error);
    }

    const profiles = response.data.map(profileData => AccessControlProfile.fromApi(profileData));
    return new BaseResponse<AccessControlProfile[] | null>(profiles, response.error);
  }

  fromApiSetups(response: BaseResponse<AccessControlSetupData[]>): BaseResponse<AccessControlSetup[] | null> {
    if (!response.data) {
      return new BaseResponse<AccessControlSetup[] | null>(null, response.error);
    }

    const setups = response.data.map(setupData => AccessControlSetup.fromApi(setupData));
    return new BaseResponse<AccessControlSetup[] | null>(setups, response.error);
  }

  #getError(data: any): ValidationResponseError | undefined {
    let error: ValidationResponseError | undefined = undefined;
    if (data) {
      error = {
        code: data.code,
        message: data.user_error,
        warnings: data.validation_warnings || [],
      };
    }
    return error;
  }

  #getProfilesToSelect(error: ValidationApiError | undefined): AccessControlProfile[] | undefined {
    if (error?.code !== ERROR_CODES.MORE_THAN_ONE_VALID_PROFILE) {
      return undefined;
    }

    const profiles = error.validation_warnings?.[0]?.extra?.profiles ?? [];
    return profiles.map(profile => new AccessControlProfile(profile.id, profile.name));
  }
}
