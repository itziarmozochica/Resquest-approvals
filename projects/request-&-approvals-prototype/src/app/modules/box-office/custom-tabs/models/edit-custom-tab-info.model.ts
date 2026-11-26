import { OssCustomTabTypes } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';

import { CustomTabIconsTypes } from './custom-tabs.model';

export const DialogEditCustomTabMode = {
  CREATE: 'create',
  EDIT: 'edit',
} as const;

export type DialogEditCustomTabModes = (typeof DialogEditCustomTabMode)[keyof typeof DialogEditCustomTabMode];

export interface DialogEditCustomFormValues {
  icon: CustomTabIconsTypes;
  name: string;
  tabType: OssCustomTabTypes;
}
