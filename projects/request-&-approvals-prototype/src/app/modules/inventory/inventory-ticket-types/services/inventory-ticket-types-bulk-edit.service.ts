import { computed, inject, Injectable, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import {
  BulkEditStep,
  BulkEditStepValue,
} from '@fz-original/app/modules/inventory/inventory-ticket-types/inventory-ticket-types-bulk-edit/models/inventory-ticket-types-bulk-edit.model';
import {
  isEmptyRichTextHtml,
  richTextHtmlToCenterTag,
} from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-content.utils';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import {
  BulkUpdateSessionTypesResult,
  NO_GROUP_OPTION_ID,
  NO_SELECTION_RULE_OPTION_ID,
  SessionType,
  SessionTypeBulkEditFormValue,
  SessionTypeBulkEditProperty,
  SessionTypeBulkEditPropertyValue,
  SessionTypeBulkEditValues,
  SessionTypeGroup,
  SessionTypeSelectionRule,
  SessionTypeTargetAttendee,
} from '@fz-original/app/shared/services/sessions/session-type.model';
import { SessionTypeService } from '@fz-original/app/shared/services/sessions/session-type.service';
import { ProductTaxRate } from '@fz-original/app/shared/services/tax-area/product-tax-area.model';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { resolveErrorCodeDisplayMessage } from '@fz-original/app/shared/utils/resolve-error-code-display-message.util';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

const BULK_EDIT_TOAST_DELAY_MS = 5000;
const MINIMUM_ALLOWED_NUM_TICKETS = 1;
const MINIMUM_TICKET_TIER = 1;

const BULK_EDIT_VALUES_PROPERTIES = Object.values(SessionTypeBulkEditProperty);

const atLeastOneItemValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { required: true };
  };
};

const allowedNumTicketsRangeValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const minimum = control.get('minimum')?.value;
    const maximum = control.get('maximum')?.value;
    const isMinimumFilled = minimum != null && String(minimum) !== '';
    const isMaximumFilled = maximum != null && String(maximum) !== '';

    if (isMinimumFilled !== isMaximumFilled) {
      return { eitherOneOrNoneFilled: true };
    }

    if (isMinimumFilled && isMaximumFilled && Number(minimum) > Number(maximum)) {
      return { lessOrEqual: true };
    }

    return null;
  };
};

export interface BulkEditValuesStepContext {
  productTaxRates: ProductTaxRate[];
  sessionTypeGroups: SessionTypeGroup[];
  sessionTypes: SessionType[];
}

@Injectable()
export class InventoryTicketTypesBulkEditService {
  readonly #sessionTypeService = inject(SessionTypeService);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #formBuilder = inject(FormBuilder);

  readonly #isOpen = signal(false);
  readonly #isSaving = signal(false);
  readonly #saveErrorMessage = signal<string | null>(null);
  readonly #currentStep = signal<BulkEditStepValue>(BulkEditStep.ticketTypes);
  readonly #pendingFormValue = signal<SessionTypeBulkEditFormValue | null>(null);
  readonly #selectedProperties = signal<SessionTypeBulkEditPropertyValue[]>([]);
  readonly #selectedSessionTypeIds = signal<number[]>([]);
  readonly #valuesFormReady = signal(false);
  readonly #selectionRuleId = signal<SelectOption['id'] | null>(null);
  readonly #groupOptions = signal<SelectOption[]>([]);
  readonly #neededSessionTypeOptions = signal<SelectOption[]>([]);
  readonly #productTypeOptions = signal<SelectOption[]>([]);
  readonly #selectionRuleOptions = signal<SelectOption[]>([]);
  readonly #targetAttendeeOptions = signal<SelectOption[]>([]);

  #valuesFormGroup: FormGroup = this.#formBuilder.group({});
  #selectionRuleSubscription: Subscription | null = null;

  readonly isOpen = this.#isOpen.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();
  readonly saveErrorMessage = this.#saveErrorMessage.asReadonly();
  readonly currentStep = this.#currentStep.asReadonly();
  readonly pendingFormValue = this.#pendingFormValue.asReadonly();
  readonly selectedProperties = this.#selectedProperties.asReadonly();
  readonly selectedSessionTypeIds = this.#selectedSessionTypeIds.asReadonly();
  readonly valuesFormReady = this.#valuesFormReady.asReadonly();
  readonly groupOptions = this.#groupOptions.asReadonly();
  readonly neededSessionTypeOptions = this.#neededSessionTypeOptions.asReadonly();
  readonly productTypeOptions = this.#productTypeOptions.asReadonly();
  readonly selectionRuleOptions = this.#selectionRuleOptions.asReadonly();
  readonly targetAttendeeOptions = this.#targetAttendeeOptions.asReadonly();
  readonly isNeedsSessionTypeRule = computed(() => this.#selectionRuleId() === SessionTypeSelectionRule.needsSessionType);

  readonly pendingProperties = computed(() => this.#pendingFormValue()?.properties ?? []);

  get valuesFormGroup(): FormGroup {
    return this.#valuesFormGroup;
  }

  clearPending(): void {
    this.#pendingFormValue.set(null);
  }

  close(): void {
    this.#isOpen.set(false);
    this.#resetWizardSelection();
    this.#resetValuesForm();
    this.#currentStep.set(BulkEditStep.ticketTypes);
    this.#pendingFormValue.set(null);
    this.#clearSaveError();
  }

  dropRestrictedPropertiesFromSelection(restrictedProperties: SessionTypeBulkEditPropertyValue[]): void {
    const restricted = new Set(restrictedProperties);
    const remainingProperties = this.#selectedProperties().filter(property => !restricted.has(property));

    if (remainingProperties.length !== this.#selectedProperties().length) {
      this.#selectedProperties.set(remainingProperties);
    }
  }

  dropSelectedIdsMissingFromListing(sessionTypeIds: number[]): void {
    const availableIds = new Set(sessionTypeIds);
    const selectedIds = this.#selectedSessionTypeIds();
    const remainingIds = selectedIds.filter(sessionTypeId => availableIds.has(sessionTypeId));

    if (remainingIds.length !== selectedIds.length) {
      this.#selectedSessionTypeIds.set(remainingIds);
    }
  }

  getValues(): SessionTypeBulkEditValues {
    const rawValue = this.#valuesFormGroup.getRawValue();

    return {
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.productType) ? { productType: rawValue.productType ?? null } : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.label) ? { label: rawValue.label ?? '' } : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.group) ? { group: rawValue.group ?? null } : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.instructions)
        ? { instructions: this.#toRichTextValue('instructions') }
        : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.details) ? { details: this.#toRichTextValue('details') } : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.allowedNumTickets)
        ? { allowedNumTickets: rawValue.allowedNumTickets ?? null }
        : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.targetAttendee) ? { targetAttendee: rawValue.targetAttendee ?? null } : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.ticketTier) ? { ticketTier: rawValue.ticketTier ?? null } : {}),
      ...(this.#isPropertySelected(SessionTypeBulkEditProperty.selectionRule) ? { rule: rawValue.rule ?? null } : {}),
    };
  }

  getValuesControlError(control: AbstractControl | null): string | null {
    if (!control?.errors || (!control.dirty && !control.touched)) {
      return null;
    }
    return Object.keys(control.errors)[0] ?? null;
  }

  isValuesSaveDisabled(): boolean {
    return this.#valuesFormGroup.invalid;
  }

  open(): void {
    this.#resetWizardSelection();
    this.#resetValuesForm();
    this.#currentStep.set(BulkEditStep.ticketTypes);
    this.#isOpen.set(true);
    this.#clearSaveError();
  }

  setCurrentStep(step: BulkEditStepValue): void {
    this.#currentStep.set(step);
  }

  setSelectedProperties(properties: SessionTypeBulkEditPropertyValue[]): void {
    this.#selectedProperties.set(properties);
  }

  setSelectedSessionTypeIds(sessionTypeIds: number[]): void {
    this.#selectedSessionTypeIds.set(sessionTypeIds);
  }

  setValuesControlValue(controlName: string, value: unknown): void {
    const control = this.#valuesFormGroup.get(controlName);
    control?.markAsDirty();
    control?.setValue(value);
  }

  syncValuesFormControls(): void {
    const selected = new Set(this.#selectedProperties());

    for (const property of BULK_EDIT_VALUES_PROPERTIES) {
      if (!selected.has(property)) {
        this.#removeValuesControl(property);
      }
    }

    for (const property of this.#selectedProperties()) {
      this.#addValuesControlIfMissing(property);
    }

    this.#valuesFormReady.set(true);
  }

  setValuesStepContext(context: BulkEditValuesStepContext): void {
    this.#productTypeOptions.set(
      context.productTaxRates.map(productTaxRate => ({
        id: productTaxRate.productType,
        title: productTaxRate.humanizedProductType,
      })),
    );

    this.#groupOptions.set([
      { id: NO_GROUP_OPTION_ID, title: this.#translate.instant('inventory.ticketTypes.bulkEdit.valuesStep.noGroup') },
      ...context.sessionTypeGroups.map(group => ({ id: group.id, title: group.name })),
    ]);

    this.#selectionRuleOptions.set([
      {
        id: NO_SELECTION_RULE_OPTION_ID,
        title: this.#translate.instant('inventory.ticketTypes.form.fields.rules.selectionRule.options.noRule'),
      },
      {
        id: SessionTypeSelectionRule.required,
        title: this.#translate.instant('inventory.ticketTypes.form.fields.rules.selectionRule.options.required'),
      },
      {
        id: SessionTypeSelectionRule.needsSessionType,
        title: this.#translate.instant('inventory.ticketTypes.form.fields.rules.selectionRule.options.needsSessionType'),
      },
    ]);

    this.#targetAttendeeOptions.set(
      Object.values(SessionTypeTargetAttendee)
        .map(targetAttendee => ({
          id: targetAttendee,
          title: this.#translate.instant(`sessions.sessionTypes.edition.field.targetAttendee.options.${targetAttendee}`),
        }))
        .sort((first, second) => first.title.localeCompare(second.title)),
    );

    const selectedSessionTypeIds = this.#selectedSessionTypeIds();
    this.#neededSessionTypeOptions.set(
      context.sessionTypes
        .filter(sessionType => !selectedSessionTypeIds.includes(sessionType.id))
        .map(sessionType => ({ id: sessionType.id, title: sessionType.label })),
    );
    this.#pruneStaleNeededSessionTypes(selectedSessionTypeIds);
  }

  /** Labels are prefixed with their group, mirroring how the wizard lists the ticket types. */
  pendingSessionTypeLabels(sessionTypes: SessionType[]): string[] {
    const selectedIds = new Set(this.#pendingFormValue()?.sessionTypeIds ?? []);
    const ungroupedName = this.#translate.instant('inventory.ticketTypes.bulkEdit.ticketTypesStep.ungrouped');

    return sessionTypes
      .filter(sessionType => selectedIds.has(sessionType.id))
      .map(sessionType => `${sessionType.groups?.[0]?.name ?? ungroupedName} | ${sessionType.label}`);
  }

  save(planId: number | null, formValue: SessionTypeBulkEditFormValue): Observable<BulkUpdateSessionTypesResult> {
    if (planId === null) {
      this.#displayError(null);
      return EMPTY;
    }

    this.#isSaving.set(true);
    this.#clearSaveError();

    return this.#sessionTypeService.bulkUpdateSessionTypes(planId, formValue).pipe(
      tap(result => {
        this.#clearSaveError();
        this.#toastService.add({
          delay: BULK_EDIT_TOAST_DELAY_MS,
          message: this.#translate.instant(
            result.kind === 'queued'
              ? 'inventory.ticketTypes.bulkEdit.successMessageQueued'
              : 'inventory.ticketTypes.bulkEdit.successMessage',
          ),
          type: ToastType.SUCCESS,
        });
      }),
      catchError((error: unknown) => {
        this.#displayError(error);
        return EMPTY;
      }),
      finalize(() => this.#isSaving.set(false)),
    );
  }

  setPending(formValue: SessionTypeBulkEditFormValue): void {
    this.#pendingFormValue.set(formValue);
  }

  #addValuesControlIfMissing(property: SessionTypeBulkEditPropertyValue): void {
    switch (property) {
      case SessionTypeBulkEditProperty.productType:
        if (!this.#valuesFormGroup.contains('productType')) {
          this.#valuesFormGroup.addControl('productType', this.#formBuilder.control(null, Validators.required));
        }
        return;
      case SessionTypeBulkEditProperty.label:
        if (!this.#valuesFormGroup.contains('label')) {
          this.#valuesFormGroup.addControl('label', this.#formBuilder.control('', Validators.required));
        }
        return;
      case SessionTypeBulkEditProperty.group:
        if (!this.#valuesFormGroup.contains('group')) {
          this.#valuesFormGroup.addControl('group', this.#formBuilder.control(null, Validators.required));
        }
        return;
      case SessionTypeBulkEditProperty.instructions:
        if (!this.#valuesFormGroup.contains('instructions')) {
          this.#valuesFormGroup.addControl('instructions', this.#formBuilder.control(''));
        }
        return;
      case SessionTypeBulkEditProperty.details:
        if (!this.#valuesFormGroup.contains('details')) {
          this.#valuesFormGroup.addControl('details', this.#formBuilder.control(''));
        }
        return;
      case SessionTypeBulkEditProperty.targetAttendee:
        if (!this.#valuesFormGroup.contains('targetAttendee')) {
          this.#valuesFormGroup.addControl('targetAttendee', this.#formBuilder.control(null, Validators.required));
        }
        return;
      case SessionTypeBulkEditProperty.ticketTier:
        if (!this.#valuesFormGroup.contains('ticketTier')) {
          this.#valuesFormGroup.addControl('ticketTier', this.#formBuilder.control(null, [Validators.min(MINIMUM_TICKET_TIER)]));
        }
        return;
      case SessionTypeBulkEditProperty.allowedNumTickets:
        if (!this.#valuesFormGroup.contains('allowedNumTickets')) {
          this.#valuesFormGroup.addControl(
            'allowedNumTickets',
            this.#formBuilder.group(
              {
                maximum: [null, [Validators.min(MINIMUM_ALLOWED_NUM_TICKETS)]],
                minimum: [null, [Validators.min(MINIMUM_ALLOWED_NUM_TICKETS)]],
              },
              { validators: [allowedNumTicketsRangeValidator()] },
            ),
          );
        }
        return;
      case SessionTypeBulkEditProperty.selectionRule:
        if (!this.#valuesFormGroup.contains('rule')) {
          this.#valuesFormGroup.addControl(
            'rule',
            this.#formBuilder.group({
              neededSessionTypes: [{ value: [] as SelectOption[], disabled: true }],
              selectionRule: [null, Validators.required],
              visibleOnlyWhenNeededSessionTypesSelected: [{ value: false, disabled: true }],
            }),
          );
          this.#bindSelectionRuleControl();
        }
    }
  }

  #bindSelectionRuleControl(): void {
    const selectionRuleControl = this.#valuesFormGroup.get('rule.selectionRule');
    if (!selectionRuleControl) {
      return;
    }

    this.#selectionRuleId.set(selectionRuleControl.value?.id ?? null);
    this.#selectionRuleSubscription = selectionRuleControl.valueChanges.subscribe(selectionRule => {
      this.#selectionRuleId.set(selectionRule?.id ?? null);
      this.#updateRulesState();
    });
    this.#updateRulesState();
  }

  #clearSaveError(): void {
    this.#saveErrorMessage.set(null);
  }

  #isPropertySelected(property: SessionTypeBulkEditPropertyValue): boolean {
    return this.#selectedProperties().includes(property);
  }

  #removeValuesControl(property: SessionTypeBulkEditPropertyValue): void {
    switch (property) {
      case SessionTypeBulkEditProperty.productType:
        this.#valuesFormGroup.removeControl('productType');
        return;
      case SessionTypeBulkEditProperty.label:
        this.#valuesFormGroup.removeControl('label');
        return;
      case SessionTypeBulkEditProperty.group:
        this.#valuesFormGroup.removeControl('group');
        return;
      case SessionTypeBulkEditProperty.instructions:
        this.#valuesFormGroup.removeControl('instructions');
        return;
      case SessionTypeBulkEditProperty.details:
        this.#valuesFormGroup.removeControl('details');
        return;
      case SessionTypeBulkEditProperty.targetAttendee:
        this.#valuesFormGroup.removeControl('targetAttendee');
        return;
      case SessionTypeBulkEditProperty.ticketTier:
        this.#valuesFormGroup.removeControl('ticketTier');
        return;
      case SessionTypeBulkEditProperty.allowedNumTickets:
        this.#valuesFormGroup.removeControl('allowedNumTickets');
        return;
      case SessionTypeBulkEditProperty.selectionRule:
        this.#unsubscribeSelectionRule();
        this.#valuesFormGroup.removeControl('rule');
    }
  }

  #resetValuesForm(): void {
    this.#unsubscribeSelectionRule();
    this.#valuesFormGroup = this.#formBuilder.group({});
    this.#valuesFormReady.set(false);
    this.#groupOptions.set([]);
    this.#neededSessionTypeOptions.set([]);
    this.#productTypeOptions.set([]);
    this.#selectionRuleOptions.set([]);
    this.#targetAttendeeOptions.set([]);
  }

  #resetWizardSelection(): void {
    this.#selectedProperties.set([]);
    this.#selectedSessionTypeIds.set([]);
  }

  #pruneStaleNeededSessionTypes(selectedSessionTypeIds: number[]): void {
    const neededSessionTypesControl = this.#valuesFormGroup.get('rule.neededSessionTypes');
    if (!neededSessionTypesControl) {
      return;
    }

    const currentValue = neededSessionTypesControl.value as SelectOption[] | null;
    if (!Array.isArray(currentValue) || currentValue.length === 0) {
      return;
    }

    const selectedIds = new Set(selectedSessionTypeIds);
    const prunedValue = currentValue.filter(option => !selectedIds.has(Number(option.id)));

    if (prunedValue.length !== currentValue.length) {
      neededSessionTypesControl.setValue(prunedValue, { emitEvent: false });
      neededSessionTypesControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  #displayError(error: unknown): void {
    const message = resolveErrorCodeDisplayMessage(this.#translate, error, 'inventory.ticketTypes.bulkEdit.errorMessage');

    this.clearPending();
    this.#saveErrorMessage.set(message);
    this.#toastService.add({
      delay: BULK_EDIT_TOAST_DELAY_MS,
      message,
      type: ToastType.ERROR,
    });
  }

  #toRichTextValue(controlName: string): string {
    const value = this.#valuesFormGroup.get(controlName)?.value ?? '';
    return isEmptyRichTextHtml(value) ? '' : richTextHtmlToCenterTag(value);
  }

  #unsubscribeSelectionRule(): void {
    if (this.#selectionRuleSubscription) {
      this.#selectionRuleSubscription.unsubscribe();
      this.#selectionRuleSubscription = null;
    }

    this.#selectionRuleId.set(null);
  }

  #updateRulesState(): void {
    const selectionRuleId = this.#selectionRuleId();
    const neededSessionTypesControl = this.#valuesFormGroup.get('rule.neededSessionTypes');
    const visibleOnlyControl = this.#valuesFormGroup.get('rule.visibleOnlyWhenNeededSessionTypesSelected');

    if (selectionRuleId !== SessionTypeSelectionRule.needsSessionType) {
      neededSessionTypesControl?.disable({ emitEvent: false });
      neededSessionTypesControl?.clearValidators();
      neededSessionTypesControl?.setValue([], { emitEvent: false });
      visibleOnlyControl?.disable({ emitEvent: false });
      visibleOnlyControl?.setValue(false, { emitEvent: false });
    } else {
      neededSessionTypesControl?.enable({ emitEvent: false });
      neededSessionTypesControl?.setValidators(atLeastOneItemValidator());
      visibleOnlyControl?.enable({ emitEvent: false });
    }

    neededSessionTypesControl?.updateValueAndValidity({ emitEvent: false });
  }
}
