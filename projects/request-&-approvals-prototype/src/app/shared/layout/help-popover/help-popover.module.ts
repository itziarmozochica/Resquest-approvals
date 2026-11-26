import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';

import { IconsModule } from '../../icons/icons.module';
import { HelpPopoverComponent } from './help-popover.component';

@NgModule({
  imports: [CommonModule, NgbPopoverModule, IconsModule],
  declarations: [HelpPopoverComponent],
  exports: [HelpPopoverComponent],
})
export class HelpPopoverModule {}
