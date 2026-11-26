import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntPillComponent } from '@ignite/legacy/components/ignt-pill/ignt-pill.component';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DeviceDetectorService } from 'ngx-device-detector';

import { IconsModule } from '../../../icons/icons.module';
import { FilterDateRangeComponent } from './date-range.component';
import { FilterDateTimeRangeComponent } from './date-time-range.component';

@NgModule({
  imports: [CommonModule, FormsModule, NgbDatepickerModule, TranslateModule, IconsModule, IgntPillComponent],
  declarations: [FilterDateRangeComponent, FilterDateTimeRangeComponent],
  exports: [FilterDateRangeComponent, FilterDateTimeRangeComponent],
  providers: [DeviceDetectorService],
})
export class FilterDateRangeModule {}
