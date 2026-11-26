import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../../icons/icons.module';
import { FilterButtonModule } from '../button/button.module';
import { FilterSelectOptionComponent } from './select-option/select-option.component';
import { FilterSelectComponent } from './select.component';

@NgModule({
  imports: [CommonModule, FilterButtonModule, NgbDropdownModule, TranslateModule, IconsModule],
  declarations: [FilterSelectComponent, FilterSelectOptionComponent],
  exports: [FilterSelectComponent, FilterSelectOptionComponent],
})
export class FilterSelectModule {}
