import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import { FilterButtonComponent } from './button.component';

@NgModule({
  declarations: [FilterButtonComponent],
  imports: [CommonModule, TranslateModule, FontAwesomeModule],
  exports: [FilterButtonComponent],
})
export class FilterButtonModule {}
