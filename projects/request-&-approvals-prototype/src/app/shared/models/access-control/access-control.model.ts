import { BaseErrorResponse } from '../base-response';

export interface AccessControlSetupData {
  id: string;
  name: string;
}

export interface AccessControlProfileData {
  id: string;
  name: string;
  setup_id: string;
}

export class AccessControlSetup {
  static fromApi(data: AccessControlSetupData): AccessControlSetup {
    return new AccessControlSetup(data.id, data.name);
  }

  constructor(
    public id: string,
    public name: string,
  ) {}
}

export class AccessControlProfile {
  static fromApi(data: AccessControlProfileData): AccessControlProfile {
    return new AccessControlProfile(data.id, data.name);
  }

  constructor(
    public id: string,
    public name: string,
  ) {}
}

export interface SetupWithProfiles {
  profiles: AccessControlProfile[];
  setup: AccessControlSetup;
}

export class GetAllProfilesResponse {
  constructor(
    public setupsWithProfiles: SetupWithProfiles[],
    public error: BaseErrorResponse | null,
  ) {}
}
