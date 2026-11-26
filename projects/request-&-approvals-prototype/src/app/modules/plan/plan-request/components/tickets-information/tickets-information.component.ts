import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { PlanRequestTicketType } from '../../models/plan-request-ticket-type/plan-request-ticket-type.model';
import { PlanRequestValidationMethod } from '../../models/plan-request/plan-request-validation-method.enum';
import { PlanRequest } from '../../models/plan-request/plan-request.model';
import { PlanRequestService } from '../../services/plan-request.service';

@Component({
  selector: 'app-plan-request-tickets-information',
  standalone: false,
  templateUrl: './tickets-information.component.html',
  styleUrls: ['./tickets-information.component.scss'],
})
export class TicketsInformationComponent implements OnInit, OnDestroy {
  @Output() updatePlanRequest: EventEmitter<PlanRequest> = new EventEmitter<PlanRequest>();
  @Input() planRequest: PlanRequest;
  @Input() validationMethodOptions: SelectOption[] = [];
  @Input() codesTypeOptions: SelectOption[] = [];
  @Input() codesValidationOptions: SelectOption[] = [];
  ticketsInformationForm: FormGroup;
  mandatoryFields: string[] = [
    'closingSales',
    'type',
    'price',
    'availableTickets',
    'weekdaysApplies',
    'validationMethod',
    'fileUrl',
    'codesType',
    'codesValidation',
    'sessionsHours',
    'faq',
    'termsAndConditions',
  ];
  private destroy$ = new Subject<void>();
  selectedValidationMethodOption: SelectOption;
  selectedCodesTypeOption: SelectOption;
  selectedCodesValidationOption: SelectOption;
  uploadError = false;

  constructor(
    private formBuilder: FormBuilder,
    private trackingService: TrackingService,
    private planRequestService: PlanRequestService,
  ) {}

  ngOnInit(): void {
    this.ticketsInformationForm = this.formBuilder.group({
      surchargeAgreed: [this.planRequest.surchargeAgreed || '', []],
      closingSales: [this.planRequest.closingSales || '', [Validators.required]],
      additionalInformation: [this.planRequest.additionalInformation || '', []],
      validationMethod: [this.planRequest.validationMethod || '', [Validators.required]],
      codesType: [this.planRequest.codesType || '', [Validators.required]],
      codesValidation: [this.planRequest.codesValidation || '', [Validators.required]],
      faq: [this.planRequest.faq || '', [Validators.required]],
      termsAndConditions: [this.planRequest.termsAndConditions || '', [Validators.required]],
      ticketTypes: this.formBuilder.array([]),
    });
    this.selectedValidationMethodOption = this.validationMethodOptions.filter(option => option.id == this.planRequest.validationMethod)[0];
    this.selectedCodesTypeOption = this.codesTypeOptions.filter(option => option.id == this.planRequest.codesType)[0];
    this.selectedCodesValidationOption = this.codesValidationOptions.filter(option => option.id == this.planRequest.codesValidation)[0];
    this.setTicketTypes();
    this.onValueChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  private setTicketTypes(): void {
    const ticketTypes = this.planRequest.ticketTypes;
    if (ticketTypes === undefined || ticketTypes.length == 0) {
      this.addTicketType();
      return;
    }
    for (const ticketType of ticketTypes) {
      const ticketTypeFormGroup = this.formBuilder.group({
        type: [ticketType.type || '', []],
        price: [ticketType.price || '', []],
        availableTickets: [ticketType.availableTickets || '', []],
        weekdaysApplies: [ticketType.weekdaysApplies || '', []],
        sessionsHours: [ticketType.sessionsHours || '', []],
      });
      this.ticketTypes().push(ticketTypeFormGroup);
    }
  }

  selectValidationMethod(option: SelectOption): void {
    this.selectedValidationMethodOption = option;
    this.ticketsInformationForm.get('validationMethod').setValue(this.selectedValidationMethodOption.id);

    if (this.ticketsInformationForm.get('validationMethod').value == PlanRequestValidationMethod.IN_APP) {
      this.ticketsInformationForm.get('codesType').setValue('');
      this.selectedCodesTypeOption = null;
      this.ticketsInformationForm.get('codesValidation').setValue('');
      this.selectedCodesValidationOption = null;

      this.planRequest.codesFileUrl = undefined;
    }
  }

  selectCodesType(option: SelectOption): void {
    this.selectedCodesTypeOption = option;
    this.ticketsInformationForm.get('codesType').setValue(this.selectedCodesTypeOption.id);
  }

  selectCodesValidation(option: SelectOption): void {
    this.selectedCodesValidationOption = option;
    this.ticketsInformationForm.get('codesValidation').setValue(this.selectedCodesValidationOption.id);
  }

  ticketTypes(): FormArray {
    return this.ticketsInformationForm.get('ticketTypes') as FormArray;
  }

  private newTicketType(): FormGroup {
    return this.formBuilder.group({
      type: ['', []],
      price: ['', []],
      availableTickets: ['', []],
      weekdaysApplies: ['', []],
      sessionsHours: ['', []],
    });
  }

  addTicketType(): void {
    if (this.ticketTypes().length < 8) {
      this.ticketTypes().push(this.newTicketType());
    }
  }

  removeTicketType(index: number): void {
    if (this.ticketTypes().length > 1) {
      this.ticketTypes().removeAt(index);
    }
  }

  private getTicketTypes(FormTicketTypes: FormArray): PlanRequestTicketType[] {
    return FormTicketTypes.value.map((ticketType: PlanRequestTicketType) => {
      return new PlanRequestTicketType(
        ticketType.type || undefined,
        ticketType.price || undefined,
        ticketType.availableTickets || undefined,
        ticketType.weekdaysApplies || undefined,
        ticketType.sessionsHours || undefined,
      );
    });
  }

  private onValueChanges(): void {
    this.ticketsInformationForm.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(formObject => {
        this.planRequest['ticketTypes'] = this.getTicketTypes(this.ticketTypes());
        this.planRequest['surchargeAgreed'] = formObject['surchargeAgreed'] || undefined;
        this.planRequest['closingSales'] = formObject['closingSales'] || undefined;
        this.planRequest['additionalInformation'] = formObject['additionalInformation'] || undefined;
        this.planRequest['validationMethod'] = formObject['validationMethod'] || undefined;
        this.planRequest['codesType'] = formObject['codesType'] || undefined;
        this.planRequest['codesValidation'] = formObject['codesValidation'] || undefined;
        this.planRequest['faq'] = formObject['faq'] || undefined;
        this.planRequest['termsAndConditions'] = formObject['termsAndConditions'] || undefined;
        this.updatePlanRequest.emit(this.planRequest);
      });
  }

  getControlClass(control: AbstractControl, showValidStatus?: boolean): string {
    if (!control.valid && control.touched) {
      return 'tickets-information-content__text-area--invalid';
    }
    if (control.value !== '') {
      return control.hasValidator(Validators.required) || showValidStatus ? 'tickets-information-content__text-area--valid' : '';
    }
    return '';
  }

  onChangeFile(files: FileList): void {
    this.uploadError = false;
    this.planRequestService.uploadFile(this.planRequest.partnerId, files[0], this.planRequest.id).subscribe(response => {
      if (response.data == null) {
        this.uploadError = true;
        this.planRequest.codesFileUrl = undefined;
      } else {
        this.planRequest.codesFileUrl = response.data;
        this.uploadError = false;
      }
    });
  }

  getControlError(control: AbstractControl): string {
    if (!control.touched) {
      return null;
    }
    const priority = ['required', 'emailValidator'];
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

    return errors.length > 0 ? errors.shift() : null;
  }
}
