import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { IconsModule } from '../../icons/icons.module';
import { WhatsappPopupComponent } from './whatsapp-popup.component';

@NgModule({
  declarations: [WhatsappPopupComponent],
  imports: [CommonModule, IconsModule],
  exports: [WhatsappPopupComponent],
})
export class WhatsappPopupModule {}
