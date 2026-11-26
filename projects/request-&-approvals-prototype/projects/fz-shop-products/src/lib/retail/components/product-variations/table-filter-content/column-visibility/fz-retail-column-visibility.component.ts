import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  selector: 'fz-retail-column-visibility',
  standalone: true,
  styleUrl: './fz-retail-column-visibility.component.scss',
  templateUrl: './fz-retail-column-visibility.component.html',
})
export class FzRetailColumnVisibilityComponent {
  readonly checkboxControl = input.required<FormControl<boolean>>();
  readonly label = input.required<string>();
  readonly title = input.required<string>();
}
