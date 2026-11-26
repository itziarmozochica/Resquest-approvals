import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AutoformatNumericInputDirective } from './autoformat-numeric-input.directive';

@NgModule({
  declarations: [AutoformatNumericInputDirective],
  imports: [CommonModule],
  exports: [AutoformatNumericInputDirective],
})
export class AutoformatNumericInputModule {}
