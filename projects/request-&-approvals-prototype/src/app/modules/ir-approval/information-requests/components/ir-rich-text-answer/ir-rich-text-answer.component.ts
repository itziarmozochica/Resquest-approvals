import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, inject, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { map, Observable } from 'rxjs';

import { InformationRequestRichTextImageService } from '../../services/information-request-rich-text-image.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntRichTextEditorComponent, ReactiveFormsModule],
  selector: 'app-ir-rich-text-answer',
  standalone: true,
  styleUrls: ['./ir-rich-text-answer.component.scss'],
  templateUrl: './ir-rich-text-answer.component.html',
})
export class IrRichTextAnswerComponent {
  @Input({ required: true }) partnerId!: number;
  @Input({ required: true }) launchId!: string;
  @Input({ required: true }) informationRequestId!: string;
  @Input({ required: true }) questionId!: string;
  @Input() readOnly = false;
  @Input() placeholder = '';

  @Output() valueChange = new EventEmitter<string>();

  protected readonly planContentFeatures = RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES;
  protected readonly control = new FormControl<string>('', { nonNullable: true });

  readonly #destroyRef = inject(DestroyRef);
  readonly #service = inject(InformationRequestRichTextImageService);

  constructor() {
    this.control.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: string) => {
      this.valueChange.emit(value);
    });
  }

  protected readonly uploadImage = (file: File): Observable<string> => {
    return this.#service
      .upload(this.partnerId, this.launchId, this.informationRequestId, this.questionId, file)
      .pipe(map(response => response.data?.url ?? ''));
  };

  @Input()
  set value(value: string | null) {
    const nextValue = value ?? '';

    if (nextValue !== this.control.value) {
      this.control.setValue(nextValue, { emitEvent: false });
    }
  }
}
