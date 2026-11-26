import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../icons/icons.module';
import { ModalContentComponent } from './modal-content.component';

@NgModule({
  imports: [CommonModule, NgbModalModule, TranslateModule, IconsModule],
  declarations: [ModalContentComponent],
  exports: [ModalContentComponent],
})
export class ModalContentModule {}
