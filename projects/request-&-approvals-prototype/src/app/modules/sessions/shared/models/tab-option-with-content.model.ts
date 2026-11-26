import { TemplateRef } from '@angular/core';

import { TabOption } from './side-tab-option.model';

export interface TabOptionWithContent extends TabOption {
  content: TemplateRef<unknown>;
}
