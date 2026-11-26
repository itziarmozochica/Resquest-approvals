import { InjectionToken } from '@angular/core';
import type { FormControl } from '@angular/forms';

import type { ContactInformationOrderableFieldEnum } from '../onsite-setup';

export const contactInfoDualScreenBroadcastChannel = 'contact_info_dual_screen_channel';

export const CONTACT_INFO_DUAL_SCREEN_IS_HOST = new InjectionToken<boolean>('CONTACT_INFO_DUAL_SCREEN_IS_HOST');

export const FIELD_NAMES = ['firstName', 'lastName', 'email', 'phoneNumber'] as const;

export type FieldName = (typeof FIELD_NAMES)[number];

export type ContactInfoFormValue = Record<FieldName, string>;

export type ContactInfoFormControls = {
  [key in keyof ContactInfoFormValue]: FormControl<ContactInfoFormValue[key]>;
};

export type SyncType = 'APPLY_VISIBLE_FIELDS' | 'CLOSE_EDIT_CONTROL' | 'INPUT_CHANGE' | 'OPEN_EDIT_CONTROL' | 'REQUEST_VISIBLE_FIELDS';

export interface SyncPayload {
  type: SyncType;
  field?: FieldName;
  fieldsOrder?: ContactInformationOrderableFieldEnum[] | null;
  fullSyncReset?: boolean;
  showConsent?: boolean;
  showEmail?: boolean;
  showPhoneNumber?: boolean;
  value?: string;
}

export type ContactInfoDualScreenHostVisibleFields = Required<
  Pick<SyncPayload, 'fieldsOrder' | 'showConsent' | 'showEmail' | 'showPhoneNumber'>
>;

export function contactInfoDualScreenInitialState(): ContactInfoFormValue {
  return FIELD_NAMES.reduce((acc, field) => {
    acc[field] = '';
    return acc;
  }, {} as ContactInfoFormValue);
}

export function contactInfoDualScreenInitialVisibility(): ContactInfoDualScreenHostVisibleFields {
  return {
    fieldsOrder: null,
    showConsent: true,
    showEmail: true,
    showPhoneNumber: true,
  };
}
