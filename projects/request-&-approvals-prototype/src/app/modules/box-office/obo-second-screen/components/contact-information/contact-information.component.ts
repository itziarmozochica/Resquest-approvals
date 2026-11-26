import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { toPhoneDisplay } from '../../../../../shared/components/contact-phone-field/contact-phone-field.util';
import {
  CONTACT_INFO_DUAL_SCREEN_IS_HOST,
  type ContactInfoFormControls,
} from '../../../shared/models/dual-screen-sync/contact-info-dual-screen-sync.model';
import { ContactInformationOrderableFieldEnum } from '../../../shared/models/onsite-setup';
import { ContactInfoDualScreenSyncService } from '../../../shared/services/dual-screen-sync/contact-info-dual-screen-sync.service';
import { SecondScreenContactInfoSyncService } from '../../../shared/services/dual-screen-sync/second-screen-contact-info-sync.service';
import { resolveContactInformationFieldsOrder } from '../../../shared/utils/contact-information-fields-order.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntInputFieldComponent, ReactiveFormsModule, TranslateModule],
  providers: [
    { provide: CONTACT_INFO_DUAL_SCREEN_IS_HOST, useValue: false },
    ContactInfoDualScreenSyncService,
    SecondScreenContactInfoSyncService,
  ],
  selector: 'app-obo-contact-information',
  standalone: true,
  styleUrl: './contact-information.component.scss',
  templateUrl: './contact-information.component.html',
})
export class ContactInformationComponent {
  readonly #formBuilder = inject(FormBuilder);

  readonly contactForm: FormGroup<ContactInfoFormControls> = this.#formBuilder.group({
    email: this.#formBuilder.control('', { nonNullable: true }),
    firstName: this.#formBuilder.control('', { nonNullable: true }),
    lastName: this.#formBuilder.control('', { nonNullable: true }),
    phoneNumber: this.#formBuilder.control('', { nonNullable: true }),
  });

  readonly phoneDisplayControl = new FormControl('', { nonNullable: true });

  readonly #secondScreenContactInfoSync = inject(SecondScreenContactInfoSyncService);

  readonly showConsent = computed(() => this.#secondScreenContactInfoSync.showConsent());
  readonly showEmail = computed(() => this.#secondScreenContactInfoSync.showEmail());
  readonly showPhoneNumber = computed(() => this.#secondScreenContactInfoSync.showPhoneNumber());
  readonly visibilityResolved = computed(() => this.#secondScreenContactInfoSync.visibilityResolved());
  readonly fieldsOrder = computed(() => this.#secondScreenContactInfoSync.fieldsOrder());

  readonly orderedVisibleFields = computed<ContactInformationOrderableFieldEnum[]>(() =>
    resolveContactInformationFieldsOrder(this.fieldsOrder(), this.showEmail(), this.showPhoneNumber()),
  );

  readonly ContactInformationOrderableFieldEnum = ContactInformationOrderableFieldEnum;

  constructor() {
    this.#secondScreenContactInfoSync.registerContactForm(this.contactForm);

    effect(() => {
      const sharedFormState = this.#secondScreenContactInfoSync.contactInfoFormState();
      untracked(() => {
        this.contactForm.patchValue(sharedFormState, { emitEvent: false });
        this.phoneDisplayControl.setValue(toPhoneDisplay(sharedFormState.phoneNumber ?? ''), { emitEvent: false });
      });
    });
  }
}
