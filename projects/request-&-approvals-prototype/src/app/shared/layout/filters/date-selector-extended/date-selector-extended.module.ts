import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FilterDateRangeModule } from '../date-range/date-range.module';
import { DateSelectorExtendedComponent } from './date-selector-extended.component';

@NgModule({
  imports: [CommonModule, FilterDateRangeModule],
  declarations: [DateSelectorExtendedComponent],
  exports: [DateSelectorExtendedComponent],
})
export class DateSelectorExtendedModule {}
