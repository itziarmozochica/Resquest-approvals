import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { UploadPlanImageService } from '@fz-original/app/modules/content-plan/services/upload-plan-image/upload-plan-image.service';
import { RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { ToastService } from '../../../../../shared/services/toast/toast.service';
import { EditingPlanService } from '../../../../content-plan/services/editing-plan/editing-plan.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IgntIconComponent, IgntRichTextEditorComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-plan-terms-and-conditions-edition',
  standalone: true,
  styleUrl: './plan-terms-and-conditions-edition.component.scss',
  templateUrl: './plan-terms-and-conditions-edition.component.html',
})
export class PlanTermsAndConditionsEditionComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #editingPlanService = inject(EditingPlanService);
  readonly #partnerService = inject(PartnerService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #uploadPlanImageService = inject(UploadPlanImageService);

  readonly htmlContent = input<string>('');
  readonly htmlContentChange = output<string>();
  readonly planId = input<number | null>(null);

  protected readonly control = new FormControl<string>('', { nonNullable: true });
  protected readonly planContentFeatures = RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES;

  constructor() {
    effect(() => {
      const nextValue = this.htmlContent();

      if (nextValue !== this.control.value) {
        this.control.setValue(nextValue, { emitEvent: false });
      }
    });

    this.control.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: string) => {
      this.htmlContentChange.emit(value);
    });
  }

  isEditorReadOnly(): boolean {
    // The in-flight upload lock is owned by ignt-rich-text-editor (via its pending-uploads state).
    // Driving [readonly] from an upload flag here would make the editor cancel its own upload.
    return !this.#editingPlanService.canEditPlan();
  }

  protected readonly uploadImage = (file: File): Observable<string> => this.#uploadImage(file);

  #uploadImage(file: File): Observable<string> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const planId = this.planId();

    if (!partnerId || !planId) {
      this.#toastService.add({
        autoHide: true,
        delay: 5000,
        message: this.#translateService.instant('planEdition.contentEdition.uploadingPhotoError'),
        sentiment: AlertSentiment.danger,
      });
      return EMPTY;
    }

    return this.#isValidImage(file).pipe(
      mergeMap(valid => {
        if (!valid) {
          this.#toastService.add({
            autoHide: true,
            delay: 5000,
            message: this.#translateService.instant('planEdition.contentEdition.invalidImageMessage'),
            sentiment: AlertSentiment.danger,
          });
          return EMPTY;
        }
        return this.#uploadPlanImageService.uploadFile(partnerId, planId, file);
      }),
      map(response => {
        if (!response.data?.fileUrl) {
          this.#toastService.add({
            autoHide: true,
            delay: 5000,
            message: this.#translateService.instant('planEdition.contentEdition.uploadingPhotoError'),
            sentiment: AlertSentiment.danger,
          });
          throw response.error;
        }
        return response.data.fileUrl;
      }),
    );
  }

  #isValidImage(file: File): Observable<boolean> {
    const validExtension = ['image/png', 'image/jpeg'].includes(file.type);
    if (!validExtension) {
      return of(false);
    }
    return new Observable(subscriber => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        subscriber.next(true);
        subscriber.complete();
      };
      img.onerror = () => {
        subscriber.next(false);
        subscriber.complete();
      };
      img.src = objectUrl;

      return () => {
        img.onload = null;
        img.onerror = null;
        URL.revokeObjectURL(objectUrl);
      };
    });
  }
}
