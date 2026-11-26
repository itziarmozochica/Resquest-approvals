import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../../../../shared/icons/icons.module';
import { TypeaheadModule } from '../../../../../shared/layout/filters/typeahead/typeahead.module';
import { OnsiteSetupModalComponent } from './onsite-setup-modal.component';

@NgModule({
  declarations: [OnsiteSetupModalComponent],
  exports: [OnsiteSetupModalComponent],
  imports: [CommonModule, TranslateModule, TypeaheadModule, IconsModule, IgntButtonComponent],
})
export class OnsiteSetupModalModule {}
