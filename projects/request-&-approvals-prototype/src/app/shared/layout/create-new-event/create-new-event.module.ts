import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { CreateNewEventComponent } from './create-new-event.component';

@NgModule({
  imports: [CommonModule, TranslateModule, RouterModule],
  declarations: [CreateNewEventComponent],
  exports: [CreateNewEventComponent],
})
export class CreateNewEventModule {}
