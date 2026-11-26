import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export enum ApplyChangesScope {
  thisEvent,
  allEvents,
}

interface GalleryConfirmationFormControls {
  confirmationCheckbox: FormControl<boolean>;
  applyChangesScope?: FormControl<ApplyChangesScope | null>;
}

type GalleryConfirmationForm = FormGroup<GalleryConfirmationFormControls>;
export type GalleryConfirmationResponse = { publish: boolean; applyChangesScope: ApplyChangesScope | null };

@Component({
  selector: 'app-gallery-confirmation-modal',
  templateUrl: './gallery-confirmation-modal.component.html',
  styleUrls: ['./gallery-confirmation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, TranslateModule, IconsModule, IgntButtonComponent],
})
export class GalleryConfirmationModalComponent implements OnChanges, OnInit {
  @Input() otherPlansSharingGallery = 0;
  @Output() response = new EventEmitter<GalleryConfirmationResponse>();

  protected galleryConfirmationForm: GalleryConfirmationForm;
  protected readonly applyChangesScopeOptionEnum = ApplyChangesScope;

  constructor() {
    this.galleryConfirmationForm = new FormGroup<GalleryConfirmationFormControls>({
      confirmationCheckbox: new FormControl<boolean>(false as boolean, { nonNullable: true, validators: [Validators.requiredTrue] }),
    });
  }

  ngOnChanges(): void {
    this.#updateControls();
  }

  ngOnInit(): void {
    this.#updateControls();
  }

  #updateControls(): void {
    const hasApplyChangesScopeControl = this.galleryConfirmationForm.controls.applyChangesScope !== undefined;
    if (this.otherPlansSharingGallery > 0 && !hasApplyChangesScopeControl) {
      this.galleryConfirmationForm.addControl('applyChangesScope', new FormControl<ApplyChangesScope | null>(null, [Validators.required]));
    } else if (hasApplyChangesScopeControl) {
      this.galleryConfirmationForm.removeControl('applyChangesScope');
    }
  }
}
