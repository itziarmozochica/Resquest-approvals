import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  Signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'chatbot-thread-rename',
  },
  imports: [ReactiveFormsModule, TranslateModule],
  selector: 'app-chatbot-thread-rename',
  standalone: true,
  styleUrl: './chatbot-thread-rename.component.scss',
  templateUrl: './chatbot-thread-rename.component.html',
})
export class ChatbotThreadRenameComponent {
  readonly MAX_TITLE_LENGTH = 200;

  initialTitle = input.required<string>();

  close = output<void>();
  save = output<string>();

  inputRef = viewChild<ElementRef<HTMLInputElement>>('renameInput');
  readonly titleFormControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(this.MAX_TITLE_LENGTH)],
  });
  readonly draftTitle: Signal<string> = toSignal(this.titleFormControl.valueChanges, {
    initialValue: this.titleFormControl.value,
  });

  readonly #destroyRef = inject(DestroyRef);
  readonly #translateService = inject(TranslateService);
  #hasEmitted = false;

  constructor() {
    afterNextRender(() => {
      const input = this.inputRef()?.nativeElement;
      if (input) {
        input.focus();
        input.select();
      }
    });

    effect(() => this.titleFormControl.setValue(this.initialTitle()));

    this.titleFormControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.inputRef()?.nativeElement.setCustomValidity('');
    });
  }

  onBlur(): void {
    if (this.#hasEmitted) return;
    this.#submit();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.#hasEmitted) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#submit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#emitClose();
    }
  }

  #submit(): void {
    const trimmed: string = this.draftTitle().trim();

    if (trimmed === '' || trimmed === this.initialTitle()) {
      this.#emitClose();
      return;
    }

    if (this.titleFormControl.invalid) {
      const message: string = this.#translateService.instant('chatbot.threads.renameMaxLengthError', { max: this.MAX_TITLE_LENGTH });
      this.inputRef()?.nativeElement.setCustomValidity(message);
      this.inputRef()?.nativeElement.reportValidity();
      return;
    }

    this.#emitSave(trimmed);
  }

  #emitClose(): void {
    this.#hasEmitted = true;
    this.close.emit();
  }

  #emitSave(value: string): void {
    this.#hasEmitted = true;
    this.save.emit(value);
  }
}
