import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { IgntButtonComponent } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../icons/icons.module';
import { PageTitleComponent } from './page-title.component';

@NgModule({
  imports: [CommonModule, RouterModule, TranslateModule, IconsModule, IgntButtonComponent, IgntIconButtonComponent],
  declarations: [PageTitleComponent],
  exports: [PageTitleComponent],
})
export class PageTitleModule {}
