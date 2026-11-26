import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, inject, Input, Output, signal, WritableSignal } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

import { ButtonSentiment, ButtonSize, ButtonVariant, IgntButtonComponent } from '../ignt-button/ignt-button.component';
import { IgntWrapperCardComponent } from '../ignt-wrapper-card/ignt-wrapper-card.component';

export type DropdownAlign = 'left' | 'right';

export interface IgntButtonDropdownOption<T> {
  label: string;
  value: T;
  disabled?: boolean;
  divider?: boolean;
  leadingIcon?: IconProp | null;
  selected?: boolean;
  trailingIcon?: IconProp | null;
  variant?: ButtonVariant | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'documentClicked($event)',
  },
  imports: [IconsModule, IgntButtonComponent, IgntWrapperCardComponent],
  selector: 'ignt-button-dropdown',
  standalone: true,
  styleUrl: './ignt-button-dropdown.component.scss',
  templateUrl: './ignt-button-dropdown.component.html',
})
export class IgntButtonDropdownComponent<T> {
  #elementRef = inject(ElementRef);

  readonly defaultOptionVariant = 'default';
  @Input() align: DropdownAlign = 'left';
  @Input() autoWidth = false;
  @Input() borderless = false;
  @Input() disabled = false;
  @Input() hoverEffect = false;
  @Input() fill = false;
  @Input() leadingIcon: IconProp | null = null;
  @Input() loading?: boolean;
  opened: WritableSignal<boolean> = signal<boolean>(false);
  @Output() openedChange = new EventEmitter<boolean>();
  @Output() optionClick = new EventEmitter<T>();
  @Input() options: IgntButtonDropdownOption<T>[] = [];
  @Input() sentiment: ButtonSentiment = 'primary';
  @Input() size: ButtonSize = 'large';
  @Input() trailingIconClosed: IconProp = ['fas', 'chevron-down'];
  @Input() trailingIconOpened: IconProp = ['fas', 'chevron-up'];
  @Input() variant: ButtonVariant = 'default';

  close(): void {
    this.#setOpened(false);
  }

  documentClicked(event: Event): void {
    if (!(this.#elementRef.nativeElement as Element).contains(event.target as Node)) {
      this.#setOpened(false);
    }
  }

  optionClicked(option: IgntButtonDropdownOption<T>): void {
    if (option.divider === true || option.disabled) {
      return;
    }
    this.optionClick.emit(option.value);
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.#setOpened(!this.opened());
  }

  #setOpened(value: boolean): void {
    if (this.opened() !== value) {
      this.opened.set(value);
      this.openedChange.emit(value);
    }
  }
}
