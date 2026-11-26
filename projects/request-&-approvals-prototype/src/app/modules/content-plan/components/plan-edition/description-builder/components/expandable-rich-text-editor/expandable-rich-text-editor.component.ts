import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RICH_TEXT_EDITOR_BLOCK_BODY_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { TranslationTextFieldComponent } from '@fz-original/app/shared/components/translation-text-field/translation-text-field.component';
import { IgntDialogService } from '@ignite/common';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';

import { RichTextExpandedModalComponent, RichTextExpandedModalData } from './rich-text-expanded-modal.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, ReactiveFormsModule, IgntRichTextEditorComponent, TranslationTextFieldComponent],
  selector: 'app-db-expandable-rich-text-editor',
  standalone: true,
  styleUrl: './expandable-rich-text-editor.component.scss',
  templateUrl: './expandable-rich-text-editor.component.html',
})
export class ExpandableRichTextEditorComponent {
  /** Translation key for the modal title. Defaults to a generic "Edit text" key. */
  readonly labelKey = input<string>('planEdition.contentEdition.builder.expandableRichText.defaultLabel');
  /** Two-way bound editor content. `model()` emits `contentChange` on every `set()`. */
  readonly content = model<string>('');
  /**
   * When `true`, the field renders read-only: instead of a disabled editor it
   * shows the shared read-only HTML display, and the expand button is hidden.
   */
  readonly disabled = input<boolean>(false);

  protected readonly blockBodyFeatures = RICH_TEXT_EDITOR_BLOCK_BODY_FEATURES;
  /**
   * The single editor value. Bound by the inline editor and, while expanded, by
   * the modal editor too — both share this instance, so live edits in either
   * flow through here (replacing the former `onContentChange` callback).
   */
  protected readonly control = new FormControl<string>('', { nonNullable: true });
  /** Unmounts the inline editor while `true`, so it isn't a second live CVA on `control` alongside the modal's editor. */
  protected readonly isExpanded = signal(false);

  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);

  constructor() {
    effect(() => {
      const value = this.content();
      if (value !== this.control.value) {
        this.control.setValue(value);
      }
    });

    this.control.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: string) => {
      this.content.set(value);
    });
  }

  protected expand(): void {
    this.isExpanded.set(true);
    const dialogRef = this.#dialogService.openModal<void, RichTextExpandedModalData>(RichTextExpandedModalComponent, {
      size: 'lg',
      data: {
        titleKey: this.labelKey(),
        control: this.control,
        readonly: this.disabled(),
      },
    });
    dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.isExpanded.set(false));
  }
}
