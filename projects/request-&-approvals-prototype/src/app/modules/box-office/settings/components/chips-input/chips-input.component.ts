import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntIconComponent, TranslateModule],
  selector: 'app-chips-input',
  standalone: true,
  styleUrls: ['./chips-input.component.scss'],
  templateUrl: './chips-input.component.html',
})
export class ChipsInputComponent {
  readonly #translateService = inject(TranslateService);
  chips: string[] = [];
  @Output() chipsChange: EventEmitter<string[]> = new EventEmitter();
  @Input() commitWhenPatternMatches = false;
  errorMessage = '';
  inputValue = '';
  @Input() invalidChipMessage = this.#translateService.instant('chips.invalidChip');
  lastChipSelected = false;
  @Input() pattern = '';
  @Input() placeholder = '';

  addChip(): void {
    this.resetErrorMessage();
    const refused: string[] = [];
    let added = false;
    this.inputValue.split(',').forEach((chip: string) => {
      const trimmedChip: string = chip.trim();
      if (trimmedChip.length === 0 || (this.pattern && !this.isValidPattern(trimmedChip))) {
        this.errorMessage = this.invalidChipMessage;
        if (trimmedChip.length > 0) refused.push(trimmedChip);
        return;
      }

      if (!this.chips.includes(trimmedChip)) {
        this.chips.push(trimmedChip);
        added = true;
      }
    });

    if (added) {
      this.chipsChange.emit(this.chips);
    }
    this.inputValue = refused.join(', ');
  }

  @Input() set defaultChips(value: string[]) {
    this.chips = [...value];
  }

  isValidPattern(value: string): boolean {
    if (!this.pattern) {
      return true;
    }

    const regex = new RegExp(this.pattern);
    return regex.test(value);
  }

  onKeyDown(event: KeyboardEvent): void {
    const eventKeyIsSeparator = [',', 'Enter'].includes(event.key);
    const eventKeyIsLeaving = event.key === 'Tab';
    const eventKeyIsDeleting = event.key === 'Backspace' && !this.inputValue;

    if (!eventKeyIsSeparator && !eventKeyIsLeaving && !eventKeyIsDeleting) {
      this.lastChipSelected = false;
      return;
    }

    if (eventKeyIsLeaving) {
      if (this.inputValue.trim().length > 0) this.addChip();
      this.lastChipSelected = false;
      return;
    }

    if (eventKeyIsSeparator) {
      this.addChip();
      this.lastChipSelected = false;
      event.preventDefault();
      return;
    }

    if (eventKeyIsDeleting) {
      if (this.lastChipSelected) this.removeLastChip();
      this.lastChipSelected = !this.lastChipSelected;
    }
  }

  onKeyUp(event: KeyboardEvent): void {
    if (this.inputValue.trim() === '') {
      this.resetErrorMessage();
      return;
    }

    if (event.key === 'Backspace') {
      return;
    }

    if (!this.pattern) {
      return;
    }

    if (!this.isValidPattern(this.inputValue.trim())) {
      this.errorMessage = this.invalidChipMessage;
      return;
    }

    this.resetErrorMessage();
    if (!this.commitWhenPatternMatches) {
      return;
    }

    this.addChip();
    this.lastChipSelected = false;
    event.preventDefault();
  }

  onModelChange(event: string): void {
    this.inputValue = event;
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    this.inputValue = event.clipboardData?.getData('text') as string;
    this.addChip();
    this.lastChipSelected = false;
    event.preventDefault();
  }

  removeChip(index: number): void {
    this.chips.splice(index, 1);
    this.chipsChange.emit(this.chips);
  }

  removeLastChip(): void {
    this.chips.pop();
    this.chipsChange.emit(this.chips);
  }

  private resetErrorMessage(): void {
    this.errorMessage = '';
  }
}
