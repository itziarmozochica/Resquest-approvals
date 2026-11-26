import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FormInputFieldValue } from '@fz-original/app/app/models/html-tag.model';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import {
  DEFAULT_IGNT_RICH_TEXT_EDITOR_BLOCK_ELEMENT,
  IgntRichTextEditorBlockElement,
  IgntRichTextEditorComponent,
  IgntRichTextEditorFeature,
} from '@ignite/rich-text-editor';
import { Observable } from 'rxjs';

import { RICH_TEXT_EDITOR_TRANSLATION_FIELD_FEATURES } from '../rich-text-editor/rich-text-editor-features.const';
import { TooltipIconComponent } from '../tooltip-icon/tooltip-icon.component';

export type TextFieldType = 'input' | 'textarea' | 'rich-text' | 'html';
export type FieldStatus = 'warning' | 'complete' | 'complete-optional' | 'none';
export type TranslationFieldRating = 'down' | 'up';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntRichTextEditorComponent,
    ReactiveFormsModule,
    TooltipIconComponent,
  ],
  selector: 'app-translation-text-field',
  standalone: true,
  styleUrl: './translation-text-field.component.scss',
  templateUrl: './translation-text-field.component.html',
})
export class TranslationTextFieldComponent {
  readonly blockElement = input<IgntRichTextEditorBlockElement>(DEFAULT_IGNT_RICH_TEXT_EDITOR_BLOCK_ELEMENT);
  /** Toolbar of the `rich-text` type. Surfaces that must keep media out pass a set without the image features. */
  readonly features = input<ReadonlySet<IgntRichTextEditorFeature>>(RICH_TEXT_EDITOR_TRANSLATION_FIELD_FEATURES);
  readonly htmlContent = input<string>('');
  readonly isTrailIconDisabled = input<boolean>(false);
  readonly isTrailIconLoading = input<boolean>(false);
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  /** Forwarded to the `rich-text` editor: on, content keeps the whitespace it was written with. */
  readonly preserveWhitespace = input<boolean>(false);
  readonly rateLabel = input<string>('');
  readonly rating = input<TranslationFieldRating | null>(null);
  readonly readonly = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly showRating = input<boolean>(false);
  readonly status = input<FieldStatus>('none');
  readonly thumbsDownAriaLabel = input<string>('');
  readonly thumbsUpAriaLabel = input<string>('');
  readonly tooltip = input<string>('');
  readonly trailIcon = input<[string, string] | null>(null);
  readonly trailIconAriaLabel = input<string>('');
  readonly type = input<TextFieldType>('input');
  readonly uploadFileCallback = input<((file: File) => Observable<string>) | null>(null);
  readonly value = input<string>('');

  readonly contentChange = output<void>();
  readonly rated = output<TranslationFieldRating>();
  readonly trailIconClicked = output<void>();
  readonly valueChange = output<string>();

  readonly #destroyRef = inject(DestroyRef);
  readonly #showSourceView = signal(false);

  protected readonly richTextControl = new FormControl<string>('', { nonNullable: true });

  protected readonly isOptionalComplete = computed<boolean>(() => this.status() === 'complete-optional');
  protected readonly isRatingLocked = computed<boolean>(() => this.readonly() || this.rating() !== null);
  protected readonly showCompleteIcon = computed<boolean>(() => this.status() === 'complete' || this.status() === 'complete-optional');
  protected readonly showOwnLabel = computed<boolean>(() => this.label().length > 0);
  protected readonly showSourceView = this.#showSourceView.asReadonly();
  protected readonly showTrailInput = computed<boolean>(
    () => this.type() === 'input' && this.trailIcon() !== null && this.trailIconAriaLabel().length > 0,
  );
  protected readonly showTrailRichText = computed<boolean>(
    () => this.type() === 'rich-text' && this.trailIcon() !== null && this.trailIconAriaLabel().length > 0,
  );
  protected readonly showWarningIcon = computed<boolean>(() => this.status() === 'warning');

  constructor() {
    // Bridge the `value` input onto the editor's `ControlValueAccessor`. The guard skips the write when
    // the control already holds the value, so echoing `valueChange` back through `value` cannot loop or
    // reset the caret while the user types.
    effect(() => {
      const nextValue = this.value();

      if (nextValue !== this.richTextControl.value) {
        this.richTextControl.setValue(nextValue, { emitEvent: false });
      }
    });

    this.richTextControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((content: string) => {
      this.valueChange.emit(content);
      this.contentChange.emit();
    });
  }

  protected copyToClipboard(content: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
    }
  }

  protected onRate(rating: TranslationFieldRating): void {
    if (this.isRatingLocked()) {
      return;
    }
    this.rated.emit(rating);
  }

  protected onTrailIconClick(): void {
    if (this.isTrailIconDisabled() || this.isTrailIconLoading() || this.readonly()) {
      return;
    }
    this.trailIconClicked.emit();
  }

  protected onTrailInputChange(value: FormInputFieldValue): void {
    if (typeof value !== 'string') {
      return;
    }
    this.valueChange.emit(value);
    this.contentChange.emit();
  }

  protected onValueChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if ('value' in target) {
      this.valueChange.emit(target.value);
    }
  }

  protected toggleSourceView(): void {
    this.#showSourceView.update(isSourceView => !isSourceView);
  }
}
