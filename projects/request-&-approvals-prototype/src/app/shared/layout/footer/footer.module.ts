import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { ModalContentComponent } from '../modal/modal-content.component';
import { ModalContentModule } from '../modal/modal-content.module';
import { ModalVideoComponent } from '../modal/modal-video/modal-video.component';
import { FooterComponent } from './footer.component';
import { footerTrackingProvider } from './tracking/footer.tracking-provider';

@NgModule({
  imports: [CommonModule, RouterModule, TranslateModule, ModalContentModule],
  declarations: [FooterComponent, ModalVideoComponent],
  exports: [FooterComponent],
  providers: [...footerTrackingProvider()],
})
export class FooterModule {}
