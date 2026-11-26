import { Business, UserApiBusinessData } from '../../../modules/settings/shared/models/business.model';
import { UserInterfaceType } from './user-interface.enum';
import { UserMfaStatusData } from './user-mfa.model';
import { UserType } from './user-type.enum';

export interface UserData {
  id: number;
  email: string;
  language: string;
  name: string;
  type: UserType;
  interface: UserInterfaceType;
  username: string;
  business?: UserApiBusinessData;
  kiosk?: unknown | null;
  phone_number?: string;
  source?: string;
  status?: string;
  /** Temporary: optional until B2BI-16235 is deployed everywhere; then always present. */
  mfa?: UserMfaStatusData;
  /** Temporary: optional until B2BI-16285 is deployed everywhere; domain maps missing → false. */
  sso_enabled?: boolean;
}

export class User {
  firstName?: string;
  lastName?: string;

  constructor(
    public id: number,
    public email?: string,
    public language?: string,
    public name?: string,
    public type?: UserType,
    public interfaceType?: UserInterfaceType,
    public username?: string,
    public business?: Business,
    public phoneNumber?: string,
  ) {}

  isKiosk(): boolean {
    return this.interfaceType == UserInterfaceType.KIOSK;
  }

  isStaff(): boolean {
    return this.type === UserType.superuser;
  }
}
