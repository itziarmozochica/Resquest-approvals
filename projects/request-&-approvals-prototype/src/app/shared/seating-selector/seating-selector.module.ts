import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../icons/icons.module';
import { ModalContentModule } from '../layout/modal/modal-content.module';
import { PipesModule } from '../pipes/pipes.module';
import { SeatingSelectorWrapperComponent } from './components/seating-selector-wrapper/seating-selector-wrapper.component';
import { SeatingSelectorComponent } from './components/seating-selector/seating-selector.component';
import { SeatingSelectorMessengerService } from './services/seating-selector-messenger/seating-selector-messenger.service';

@NgModule({
  imports: [PipesModule, CommonModule, TranslateModule, IconsModule, ModalContentModule],
  declarations: [SeatingSelectorComponent, SeatingSelectorWrapperComponent],
  exports: [SeatingSelectorComponent, SeatingSelectorWrapperComponent],
  providers: [SeatingSelectorMessengerService, NgbActiveModal],
})
export class SeatingSelectorModule {}
