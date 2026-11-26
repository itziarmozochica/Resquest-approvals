import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IgntTooltipDirective } from '@ignite/common';

import { RadioInputChange } from './types/radio-input-change.type';

@Component({
  selector: 'ignt-radio',
  templateUrl: './ignt-radio.component.html',
  styleUrls: ['./ignt-radio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgIf, FontAwesomeModule, IgntTooltipDirective],
})
export class IgntRadioComponent {
  static radioCount = 0;

  #changeDetectorRef = inject(ChangeDetectorRef);
  #radioChangeHandler: (value: RadioInputChange) => void = () => {};
  @Output() change = new EventEmitter<RadioInputChange>();
  @Input() checked = false;
  @Input() dataTestId = '';
  @Input() description: string | null = null;
  @Input() disabled = false;
  @Input() id = `radio-${IgntRadioComponent.radioCount++}`;
  @Input() label = '';
  @Input() name = '';

  @Input() size: 'base' | 'small' = 'base';

  @Input() tooltip: string | null = null;

  @Input() value: string | number | boolean = '';

  detectChangesOnValueUpdated() {
    this.#changeDetectorRef.detectChanges();
  }

  onChange(event: Event) {
    event.stopPropagation();
  }

  onClick(event: Event) {
    this.checked = (event.target as HTMLInputElement).checked;
    const eventChange = {
      source: this,
      value: this.value,
    };
    this.change.emit(eventChange);
    this.#radioChangeHandler(eventChange);
  }

  registerRadioChangeHandler(fn: (value: RadioInputChange) => void) {
    this.#radioChangeHandler = fn;
  }
}
