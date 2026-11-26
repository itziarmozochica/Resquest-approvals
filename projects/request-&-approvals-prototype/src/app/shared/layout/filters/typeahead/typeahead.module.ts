import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PlanStatusTagComponent } from '@fz-original/app/shared/components/tag/plan-status-tag.component';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

import { InputMobileBehaviorModule } from '../../../directives/input-mobile-behavior/input-mobile-behavior.module';
import { IconsModule } from '../../../icons/icons.module';
import { FilterButtonModule } from '../button/button.module';
import { TypeaheadComponent } from './typeahead.component';

@NgModule({
  imports: [
    CommonModule,
    IconsModule,
    NgbTypeaheadModule,
    FormsModule,
    FilterButtonModule,
    InputMobileBehaviorModule,
    PlanStatusTagComponent,
  ],
  declarations: [TypeaheadComponent],
  exports: [TypeaheadComponent],
})
export class TypeaheadModule {}
