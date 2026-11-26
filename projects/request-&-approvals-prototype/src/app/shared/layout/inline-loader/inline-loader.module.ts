import { NgModule } from '@angular/core';

import { IconsModule } from '../../icons/icons.module';
import { InlineLoaderComponent } from './inline-loader.component';
import { InlineLoaderDirective } from './inline-loader.directive';

@NgModule({
  declarations: [InlineLoaderDirective, InlineLoaderComponent],
  imports: [IconsModule],
  exports: [InlineLoaderDirective],
})
export class InlineLoaderModule {}
