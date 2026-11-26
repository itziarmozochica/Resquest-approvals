import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RICH_TEXT_EDITOR_BLOCK_BODY_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Data the parent opener (`ExpandableRichTextEditorComponent`) passes when
 * calling `IgntDialogService.openModal(RichTextExpandedModalComponent, …)`.
 *
 * `control` is the parent's own `FormControl`: the modal binds the **same**
 * instance, so live edits flow back through the shared reactive-forms control
 * (no callback needed).
 */
export interface RichTextExpandedModalData {
  readonly titleKey: string;
  readonly control: FormControl<string>;
  readonly readonly: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule, ReactiveFormsModule, IgntRichTextEditorComponent],
  selector: 'app-db-rich-text-expanded-modal',
  standalone: true,
  styleUrl: './rich-text-expanded-modal.component.scss',
  templateUrl: './rich-text-expanded-modal.component.html',
})
export class RichTextExpandedModalComponent {
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<void>;

  protected readonly data = inject<RichTextExpandedModalData>(IGNT_DIALOG_DATA);
  protected readonly blockBodyFeatures = RICH_TEXT_EDITOR_BLOCK_BODY_FEATURES;

  protected back(): void {
    this.#dialogRef.close();
  }
}
