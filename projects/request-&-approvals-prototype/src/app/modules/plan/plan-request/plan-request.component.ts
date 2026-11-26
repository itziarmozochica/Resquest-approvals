import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { SendPlanRequestEvent } from '../../../core/tracking/core/events/send-plan-request';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { MessageModalComponent } from '../../../shared/components/message-modal/message-modal.component';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import {
  eventSetUpFormStep,
  photosFormStep,
  reviewFormStep,
  Step,
  ticketsInformationFormStep,
} from '../../../shared/models/step/step.model';
import { User } from '../../../shared/models/user/user.model';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { UserService } from '../../../shared/services/user/user.service';
import { PlanRequestCodesType } from './models/plan-request/plan-request-codes-type.enum';
import { PlanRequestCodesValidation } from './models/plan-request/plan-request-codes-validation.enum';
import { PlanRequestStatus } from './models/plan-request/plan-request-status.enum';
import { PlanRequestValidationMethod } from './models/plan-request/plan-request-validation-method.enum';
import { PlanRequest } from './models/plan-request/plan-request.model';
import { PlanRequestService } from './services/plan-request.service';

@Component({
  selector: 'app-plan-request',
  standalone: false,
  templateUrl: './plan-request.component.html',
  styleUrls: ['./plan-request.component.scss'],
})
export class PlanRequestComponent implements OnInit {
  @Input() planRequestId: string | null = null;
  @Output() goBack: EventEmitter<any> = new EventEmitter<any>();
  eventSetUpFormStep: Step = eventSetUpFormStep;
  ticketsInformationFormStep: Step = ticketsInformationFormStep;
  photosFormStep: Step = photosFormStep;
  reviewFormStep: Step = reviewFormStep;
  currentStep: Step = this.eventSetUpFormStep;
  planRequest: PlanRequest | null = null;
  partnerEmail: string = this.partnerService.getPartner()?.email ?? '';
  private partnerId: number | null = this.partnerService.getPartner()?.id ?? null;
  private b2bUser: User | null = this.userService.getUser();
  validationMethodOptions: SelectOption[] = [];
  codesTypeOptions: SelectOption[] = [];
  codesValidationOptions: SelectOption[] = [];
  isFormValid = false;

  constructor(
    private partnerService: PartnerService,
    private userService: UserService,
    private planRequestService: PlanRequestService,
    private translate: TranslateService,
    private modalService: NgbModal,
    private trackingService: TrackingService,
  ) {}

  ngOnInit(): void {
    this.getPlanRequest(this.planRequestId);

    this.setPreviousAndNextSteps();
    this.getValidationMethodOptions();
    this.getCodesTypeOptions();
    this.getCodesValidationOptions();
  }

  private getPlanRequest(planRequestId: string | null): void {
    if (this.partnerId === null) {
      return;
    }

    if (!planRequestId) {
      this.planRequest = new PlanRequest(PlanRequestStatus.TO_BE_SUBMITTED, this.partnerId, [], [], []);
      return;
    }
    this.planRequestService
      .getPlanRequest({ partnerId: this.partnerId, planRequestId: planRequestId })
      .pipe(
        map(response => {
          if (response && response.data) {
            this.planRequest = response.data;
            return;
          }
          const modal = this.modalService.open(MessageModalComponent);
          modal.componentInstance.title = this.translate.instant('common.errorTitle');
          modal.componentInstance.messages = [this.translate.instant('planRequest.error')];
        }),
      )
      .subscribe();
  }

  nextStep(): void {
    const partnerId = this.partnerId;
    const planRequest = this.planRequest;
    const b2bUser = this.b2bUser;
    if (partnerId === null || planRequest === null || b2bUser === null) {
      return;
    }

    if (this.planRequestId == null) {
      this.planRequestService.createPlanRequest(partnerId, planRequest, b2bUser).subscribe(response => {
        if (response && response.data) {
          this.planRequestId = response.data;
          planRequest.id = response.data;
          planRequest.b2bUser = b2bUser;
          this.goToNextStep();
          window.scrollTo(0, 0);
        } else {
          const modal = this.modalService.open(MessageModalComponent);
          modal.componentInstance.title = this.translate.instant('common.errorTitle');
          modal.componentInstance.messages = [this.translate.instant('planRequest.error')];
        }
      });

      return;
    }
    this.planRequestService.updatePlanRequest(partnerId, this.planRequestId, planRequest).subscribe(response => {
      if (response && response.data) {
        this.goToNextStep();
        window.scrollTo(0, 0);
      } else {
        const modal = this.modalService.open(MessageModalComponent);
        modal.componentInstance.title = this.translate.instant('common.errorTitle');
        modal.componentInstance.messages = [this.translate.instant('planRequest.error')];
      }
    });
  }

  previousStep(): void {
    const partnerId = this.partnerId;
    const planRequest = this.planRequest;
    const b2bUser = this.b2bUser;
    if (partnerId === null || planRequest === null || b2bUser === null) {
      return;
    }

    if (this.planRequestId == null) {
      this.planRequestService.createPlanRequest(partnerId, planRequest, b2bUser).subscribe(response => {
        if (response && response.data) {
          this.planRequestId = response.data;
          this.goToPreviousStep();
          window.scrollTo(0, 0);
        } else {
          const modal = this.modalService.open(MessageModalComponent);
          modal.componentInstance.title = this.translate.instant('common.errorTitle');
          modal.componentInstance.messages = [this.translate.instant('planRequest.error')];
        }
      });

      return;
    }
    this.planRequestService.updatePlanRequest(partnerId, this.planRequestId, planRequest).subscribe(response => {
      if (response && response.data) {
        this.goToPreviousStep();
        window.scrollTo(0, 0);
      } else {
        const modal = this.modalService.open(MessageModalComponent);
        modal.componentInstance.title = this.translate.instant('common.errorTitle');
        modal.componentInstance.messages = [this.translate.instant('planRequest.error')];
      }
    });
  }

  protected setPreviousAndNextSteps(): void {
    this.eventSetUpFormStep.nextStep = this.ticketsInformationFormStep;
    this.ticketsInformationFormStep.previousStep = this.eventSetUpFormStep;
    this.ticketsInformationFormStep.nextStep = this.photosFormStep;
    this.photosFormStep.previousStep = this.ticketsInformationFormStep;
    this.photosFormStep.nextStep = this.reviewFormStep;
    this.reviewFormStep.previousStep = this.photosFormStep;
  }

  updatePlanRequest(planRequest: PlanRequest): void {
    this.planRequest = planRequest;
  }

  updateIsFormValid(isFormValid: boolean): void {
    this.isFormValid = isFormValid;
  }

  sendPlanRequest(): void {
    const partnerId = this.partnerId;
    const planRequest = this.planRequest;
    const planRequestId = this.planRequestId;
    if (partnerId === null || planRequest === null || planRequestId === null) {
      return;
    }

    this.trackingService.track(new SendPlanRequestEvent());

    if (planRequest.status == PlanRequestStatus.TO_BE_SUBMITTED) {
      this.planRequestService.zendeskTicketSend(planRequestId, partnerId).subscribe();
    }

    planRequest.status = PlanRequestStatus.SUBMITTED;
    this.planRequestService.updatePlanRequest(partnerId, planRequestId, planRequest).subscribe(response => {
      if (response && response.data) {
        this.clickGoBack();
        return;
      }
      planRequest.status = PlanRequestStatus.TO_BE_SUBMITTED;
      const modal = this.modalService.open(MessageModalComponent);
      modal.componentInstance.title = this.translate.instant('common.errorTitle');
      modal.componentInstance.messages = [this.translate.instant('planRequest.error')];
    });
  }

  clickGoBack(): void {
    this.goBack.emit();
  }

  private goToPreviousStep(): void {
    if (this.currentStep.previousStep) {
      this.currentStep = this.currentStep.previousStep;
    }
  }

  private goToNextStep(): void {
    if (this.currentStep.nextStep) {
      this.currentStep = this.currentStep.nextStep;
    }
  }

  private getValidationMethodOptions(): void {
    const inAppTitle = 'planRequest.ticketsInformation.inApp';
    this.validationMethodOptions.push({ id: PlanRequestValidationMethod.IN_APP, title: this.translate.instant(inAppTitle) });

    const feverCodesTitle = 'planRequest.ticketsInformation.feverCodes';
    this.validationMethodOptions.push({ id: PlanRequestValidationMethod.FEVER_CODES, title: this.translate.instant(feverCodesTitle) });

    const partnerCodesTitle = 'planRequest.ticketsInformation.partnerCodes';
    this.validationMethodOptions.push({ id: PlanRequestValidationMethod.PARTNERS_CODES, title: this.translate.instant(partnerCodesTitle) });
  }

  private getCodesTypeOptions(): void {
    const qrTitle = 'planRequest.ticketsInformation.qr';
    this.codesTypeOptions.push({ id: PlanRequestCodesType.QR, title: this.translate.instant(qrTitle) });

    const barcodeTitle = 'planRequest.ticketsInformation.barcode';
    this.codesTypeOptions.push({ id: PlanRequestCodesType.BARCODE, title: this.translate.instant(barcodeTitle) });

    const alphanumericTitle = 'planRequest.ticketsInformation.alphanumeric';
    this.codesTypeOptions.push({ id: PlanRequestCodesType.ALPHANUMERIC, title: this.translate.instant(alphanumericTitle) });
  }

  private getCodesValidationOptions(): void {
    const partnersAppTitle = 'planRequest.ticketsInformation.partnersApp';
    this.codesValidationOptions.push({ id: PlanRequestCodesValidation.PARTNERS_APP, title: this.translate.instant(partnersAppTitle) });

    const thirdPartyTitle = 'planRequest.ticketsInformation.thirdParty';
    this.codesValidationOptions.push({ id: PlanRequestCodesValidation.THIRD_PARTY, title: this.translate.instant(thirdPartyTitle) });
  }
}
