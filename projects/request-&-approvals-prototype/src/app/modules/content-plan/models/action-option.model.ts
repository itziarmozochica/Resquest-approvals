import { IgntIconName, IgntIconVariant } from '@ignite/icon';

import { ActionOptionEnum } from './action-option.enum';

export class ActionOption {
  constructor(
    public id: ActionOptionEnum,
    public label: string,
    public icon?: { name: IgntIconName; variant: IgntIconVariant },
  ) {}
}
