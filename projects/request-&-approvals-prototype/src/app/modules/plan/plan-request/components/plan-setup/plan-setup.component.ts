import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import moment from 'moment-timezone';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { FilterDateRange } from '../../../../../shared/layout/filters/date-range/date-range.interface';
import { PLAN_NAME_MAX_LENGTH } from '../../../../../shared/models/plan/plan-constraints.const';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { DateUtil } from '../../../../../shared/utils/date.util';
import { PlanRequestDate } from '../../models/plan-request-date/plan-request-date.model';
import { PlanRequest } from '../../models/plan-request/plan-request.model';
import { PlanRequestService } from '../../services/plan-request.service';

@Component({
  selector: 'app-plan-setup',
  standalone: false,
  templateUrl: './plan-setup.component.html',
  styleUrls: ['./plan-setup.component.scss'],
})
export class PlanSetupComponent implements OnInit, OnDestroy {
  @Output() updatePlanRequest: EventEmitter<PlanRequest> = new EventEmitter<PlanRequest>();
  @Input() planRequest!: PlanRequest;
  readonly PLAN_NAME_MAX_LENGTH = PLAN_NAME_MAX_LENGTH;
  planSetUpForm!: FormGroup;
  mandatoryFields: string[] = ['planName', 'planDescription', 'dates', 'city', 'address', 'accessibility'];
  protected destroy$ = new Subject<void>();
  dateRanges: Map<number, FilterDateRange> = new Map();

  constructor(
    protected formBuilder: FormBuilder,
    protected trackingService: TrackingService,
    protected partnerService: PartnerService,
    protected planRequestService: PlanRequestService,
  ) {}

  ngOnInit(): void {
    this.planSetUpForm = this.formBuilder.group({
      planName: [this.planRequest.planName || '', [Validators.required]],
      planDescription: [this.planRequest.planDescription || '', [Validators.required]],
      city: [this.planRequest.city || '', [Validators.required]],
      address: [this.planRequest.address || '', [Validators.required]],
      accessibility: [this.planRequest.accessibility, [Validators.required]],
      dates: this.formBuilder.array([]),
    });
    this.setDates();
    this.onValueChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  dates(): FormArray {
    return this.planSetUpForm.get('dates') as FormArray;
  }

  private setDates(): void {
    const dates = this.planRequest.dates;
    if (dates === undefined || dates.length == 0) {
      this.addDate();
      return;
    }
    for (const date of dates) {
      const dateFormGroup = this.formBuilder.group({
        startsAt: [date.startsAt, []],
        endsAt: [date.endsAt, []],
      });
      const startDates = moment(date.startsAt).tz(moment.tz.guess()).toDate();
      const endDates = moment(date.endsAt).tz(moment.tz.guess()).toDate();
      this.dateRanges.set(dates.indexOf(date), {
        startDate: startDates,
        endDate: endDates,
      });
      this.dates().push(dateFormGroup);
    }
  }

  private newDate(): FormGroup {
    return this.formBuilder.group({
      startsAt: ['', []],
      endsAt: ['', []],
    });
  }

  addDate(): void {
    if (this.dates().length < 6) {
      this.dates().push(this.newDate());
    }
  }

  removeDate(index: number): void {
    this.dates().removeAt(index);
    this.planRequest.dates = this.getDates(this.dates());
    this.updateDateRanges();
  }

  private updateDateRanges(): void {
    const dates: PlanRequestDate[] = this.planRequest.dates;
    this.dateRanges.clear();
    for (const date of dates) {
      const startDates = moment(date.startsAt).tz(moment.tz.guess()).toDate();
      const endDates = moment(date.endsAt).tz(moment.tz.guess()).toDate();
      this.dateRanges.set(dates.indexOf(date), {
        startDate: startDates,
        endDate: endDates,
      });
    }
  }

  updateDate(dateRange: FilterDateRange | null, index: number): void {
    const startDate = dateRange?.startDate ?? null;
    const endDate = dateRange?.endDate ?? null;
    if (startDate === null || endDate === null) {
      return;
    }
    const dates = DateUtil.prepareDateRangeForSave(startDate, endDate);
    this.dates().value[index]['startsAt'] = dates.startDate + 'Z';
    this.dates().value[index]['endsAt'] = dates.endDate + 'Z';
    this.planRequest.dates = this.getDates(this.dates());
  }

  private getDates(FormDates: FormArray): PlanRequestDate[] {
    return FormDates.value
      .map((date: PlanRequestDate) => {
        if (date.startsAt !== '' && date.endsAt !== null) {
          return new PlanRequestDate(date.startsAt, date.endsAt);
        }
      })
      .filter((possibleDate: PlanRequestDate | undefined) => possibleDate !== undefined);
  }

  private onValueChanges(): void {
    this.planSetUpForm.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(formObject => {
      this.planRequest.planName = formObject['planName'] || undefined;
      this.planRequest.planDescription = formObject['planDescription'] || undefined;
      this.planRequest.city = formObject['city'] || undefined;
      this.planRequest.address = formObject['address'] || undefined;
      if (formObject.accessibility !== undefined && formObject.accessibility !== null) {
        this.planRequest.accessibility = formObject.accessibility;
      }
      this.updatePlanRequest.emit(this.planRequest);
    });
  }

  getControlClass(control: AbstractControl, showValidStatus?: boolean): string {
    if (!control.valid && control.touched) {
      return 'form-input--invalid';
    }
    if (control.value !== '') {
      return control.hasValidator(Validators.required) || showValidStatus ? 'form-input--valid' : '';
    }
    return '';
  }

  getControlError(control: AbstractControl): string | null {
    if (!control.touched) {
      return null;
    }
    const priority = ['required'];
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    return errors.length > 0 ? (errors.shift() ?? null) : null;
  }

  loadGuideLinesUrl(): string {
    const partner = this.partnerService.getPartner();
    return this.planRequestService.getGuideLinesUrl(partner?.countryCode);
  }
}
