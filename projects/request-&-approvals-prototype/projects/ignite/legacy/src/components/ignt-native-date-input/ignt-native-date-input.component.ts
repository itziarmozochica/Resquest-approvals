import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, input, Output } from '@angular/core';

import { IgntFieldErrorComponent } from '../ignt-field-error/ignt-field-error.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, IgntFieldErrorComponent],
  selector: 'ignt-native-date-input',
  standalone: true,
  styleUrls: ['./ignt-native-date-input.component.scss'],
  templateUrl: './ignt-native-date-input.component.html',
})
export class IgntNativeDateInputComponent {
  readonly disabled = input<boolean>(false);
  @Input() errorMessage = '';
  @Input() hasError = false;
  @Input() inputId = '';
  @Input() min = '';
  @Input() testId = '';
  @Input() type: 'date' | 'datetime-local' = 'date';
  @Input() value = '';

  @Output() blurred = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();

  onInputBlur(): void {
    this.blurred.emit();
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.valueChange.emit(input.value);
  }
}
