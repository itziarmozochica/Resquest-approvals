import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FilterButtonModule } from './button/button.module';
import { FilterDateRangeModule } from './date-range/date-range.module';
import { FiltersComponent } from './filters.component';
import { IgntTypeaheadModule } from './ignt-typeahead/ignt-typeahead.module';
import { FilterSelectModule } from './select/select.module';
import { TypeaheadModule } from './typeahead/typeahead.module';

@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [FiltersComponent],
  exports: [FilterSelectModule, FilterButtonModule, FilterDateRangeModule, TypeaheadModule, IgntTypeaheadModule, FiltersComponent],
})
export class FiltersModule {}
