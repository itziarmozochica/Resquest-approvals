import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ModalContentModule } from '../../../../../shared/layout/modal/modal-content.module';
import { SeatingMapModalComponent } from './seating-map-modal.component';

@NgModule({
  imports: [CommonModule, ModalContentModule],
  declarations: [SeatingMapModalComponent],
  exports: [SeatingMapModalComponent],
})
export class SeatingMapModalModule {}
