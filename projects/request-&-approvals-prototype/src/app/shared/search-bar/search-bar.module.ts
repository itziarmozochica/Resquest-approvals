import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../icons/icons.module';
import { FiltersModule } from '../layout/filters/filters.module';
import { CapacitySearchBarComponent } from './components/capacity-search-bar/capacity-search-bar-component';
import { SearchBarComponent } from './search-bar.component';

@NgModule({
  declarations: [CapacitySearchBarComponent, SearchBarComponent],
  imports: [IgntAlertComponent, CommonModule, FiltersModule, TranslateModule, IconsModule],
  exports: [CapacitySearchBarComponent, SearchBarComponent],
})
export class SearchBarModule {}
