import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

import { FeverOnlyMarkerComponent } from '../../../components/fever-only-marker/fever-only-marker.component';
import { PlanStatusTagComponent } from '../../../components/tag/plan-status-tag.component';
import { IconsModule } from '../../../icons/icons.module';
import { FilterButtonModule } from '../button/button.module';
import { IgntTypeaheadComponent } from './ignt-typeahead.component';

@NgModule({
  imports: [
    CommonModule,
    IconsModule,
    NgbTypeaheadModule,
    FormsModule,
    FeverOnlyMarkerComponent,
    FilterButtonModule,
    PlanStatusTagComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntTooltipDirective,
  ],
  declarations: [IgntTypeaheadComponent],
  exports: [IgntTypeaheadComponent],
})
export class IgntTypeaheadModule {}
