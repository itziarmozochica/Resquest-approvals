import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { map, switchMap } from 'rxjs/operators';

import { IrFormLayoutComponent } from '../../components/ir-form-layout/ir-form-layout.component';
import {
  InformationRequestReviewAction,
  InformationRequestReviewErrorKey,
  informationRequestReviewI18nKey,
  informationRequestReviewReasonMaxLength,
  InformationRequestSendBackAction,
} from '../../models/information-request-review.model';
import { buildAnswersForm, IrAnswersForm } from '../../models/ir-answers-form.util';
import { InformationRequestEvaluationFacade } from '../../services/information-request-evaluation.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntTextareaFieldComponent,
    IgntWrapperCardComponent,
    IrFormLayoutComponent,
  ],
  providers: [InformationRequestEvaluationFacade],
  selector: 'app-information-request-evaluation',
  styleUrl: './information-request-evaluation.component.scss',
  templateUrl: './information-request-evaluation.component.html',
})
export class InformationRequestEvaluationComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #facade = inject(InformationRequestEvaluationFacade);
  readonly #route = inject(ActivatedRoute);

  readonly #launchId = signal<string>('');
  readonly #sendBackAction = signal<InformationRequestSendBackAction | null>(null);
  readonly #isReasonMissing = signal<boolean>(false);

  protected readonly reviewAction = InformationRequestReviewAction;
  protected readonly reasonMaxLength = informationRequestReviewReasonMaxLength;
  protected readonly request = this.#facade.request;
  protected readonly launchName = this.#facade.launchName;
  protected readonly isLoading = this.#facade.isLoading;
  protected readonly loadErrorKey = this.#facade.loadErrorKey;
  protected readonly partnerId = this.#facade.partnerId;
  protected readonly isSubmitting = this.#facade.isSubmitting;
  protected readonly launchId = this.#launchId.asReadonly();
  protected readonly sendBackAction = this.#sendBackAction.asReadonly();
  protected readonly reasonControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.maxLength(informationRequestReviewReasonMaxLength)],
  });
  readonly #isReasonOverMaxLength = toSignal(this.reasonControl.statusChanges.pipe(map(() => this.reasonControl.hasError('maxlength'))), {
    initialValue: false,
  });
  protected readonly isReasonTooLong = computed<boolean>(
    () => this.#isReasonOverMaxLength() || this.#hasSendBackReviewError(InformationRequestReviewErrorKey.ReasonTooLong),
  );
  protected readonly isReasonRequired = computed<boolean>(
    () => this.#isReasonMissing() || this.#hasSendBackReviewError(InformationRequestReviewErrorKey.ReasonRequired),
  );
  protected readonly reviewErrorKey = computed<InformationRequestReviewErrorKey | null>(() => {
    const key = this.#facade.reviewErrorKey();
    const isReasonError = key === InformationRequestReviewErrorKey.ReasonRequired || key === InformationRequestReviewErrorKey.ReasonTooLong;
    return isReasonError && this.#sendBackAction() !== null ? null : key;
  });
  protected readonly answersForm = computed<IrAnswersForm>(() => {
    const ir = this.request();
    const form = buildAnswersForm(ir?.questions ?? [], { referencedStepperTemplates: ir?.referencedStepperTemplates ?? {} });
    form.disable({ emitEvent: false });
    return form;
  });
  protected readonly confirmLabelKey = computed<string>(() => {
    const action = this.#sendBackAction();
    return action ? `informationRequests.evaluation.confirm.${informationRequestReviewI18nKey[action]}` : '';
  });

  constructor() {
    this.#route.paramMap
      .pipe(
        switchMap(params => {
          const launchId = this.#route.parent?.snapshot.paramMap.get('projectId') ?? '';
          this.#launchId.set(launchId);
          this.#sendBackAction.set(null);
          this.#isReasonMissing.set(false);
          return this.#facade.load(launchId, params.get('requestId') ?? '');
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
    this.reasonControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#isReasonMissing.set(false));
  }

  protected approve(): void {
    this.#review(InformationRequestReviewAction.Approve, '');
  }

  protected openSendBack(action: InformationRequestSendBackAction): void {
    this.reasonControl.reset('');
    this.#isReasonMissing.set(false);
    this.#facade.clearReviewError();
    this.#sendBackAction.set(action);
  }

  protected cancelSendBack(): void {
    this.#sendBackAction.set(null);
    this.#isReasonMissing.set(false);
    this.#facade.clearReviewError();
  }

  protected confirmSendBack(): void {
    const action = this.#sendBackAction();
    if (!action || this.reasonControl.invalid) {
      return;
    }
    const reason = this.reasonControl.value.trim();
    if (!reason) {
      this.#isReasonMissing.set(true);
      return;
    }
    this.#isReasonMissing.set(false);
    this.#review(action, reason);
  }

  #hasSendBackReviewError(key: InformationRequestReviewErrorKey): boolean {
    return this.#sendBackAction() !== null && this.#facade.reviewErrorKey() === key;
  }

  #review(action: InformationRequestReviewAction, reason: string): void {
    this.#facade.review(action, reason).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }
}
