import { NgModule } from '@angular/core';

import { IgntDialogContentComponent } from './components/dialog-content/dialog-content.component';
import { IgntDialogFooterComponent } from './components/dialog-footer/dialog-footer.component';
import { IgntDialogHeaderComponent } from './components/dialog-header/dialog-header.component';

@NgModule({
  exports: [IgntDialogContentComponent, IgntDialogFooterComponent, IgntDialogHeaderComponent],
  imports: [IgntDialogContentComponent, IgntDialogFooterComponent, IgntDialogHeaderComponent],
})
export class IgntDialogModule {}
