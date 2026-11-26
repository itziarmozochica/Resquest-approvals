import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RetailSetupType } from '../../../core/models/retail-setup-type.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, ReactiveFormsModule],
  selector: 'fz-retail-select-option',
  standalone: true,
  styleUrl: './retail-select-option.component.scss',
  templateUrl: './retail-select-option.component.html',
})
export class RetailSelectOptionComponent {
  readonly description = input.required<string>();
  readonly iconSrc = input.required<string>();
  readonly optionControl = input.required<FormControl<RetailSetupType | null>>();
  readonly selectedValue = input.required<RetailSetupType>();
  readonly title = input.required<string>();
  readonly isOptionActive = input<boolean>(false);
}
