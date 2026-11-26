import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { PlanStatusTagComponent } from '../../../components/tag/plan-status-tag.component';
import { IconsModule } from '../../../icons/icons.module';
import { MultiSelectComponent } from './multi-select.component';

@NgModule({
  declarations: [MultiSelectComponent],
  imports: [
    CommonModule,
    IconsModule,
    NgbDropdownModule,
    FormsModule,
    TranslateModule,
    PlanStatusTagComponent,
    IgntButtonComponent,
    IgntIconButtonComponent,
  ],
  exports: [MultiSelectComponent],
})
export class MultiSelectModule {}
