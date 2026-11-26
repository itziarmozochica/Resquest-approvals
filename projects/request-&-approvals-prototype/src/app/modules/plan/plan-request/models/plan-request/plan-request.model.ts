import { User } from '../../../../../shared/models/user/user.model';
import { PlanRequestDate, PlanRequestDateData } from '../plan-request-date/plan-request-date.model';
import { PlanRequestImage, PlanRequestImageData } from '../plan-request-image/plan-request-image.model';
import { PlanRequestTicketType, PlanRequestTicketTypeData } from '../plan-request-ticket-type/plan-request-ticket-type.model';
import { PlanRequestCodesType } from './plan-request-codes-type.enum';
import { PlanRequestCodesValidation } from './plan-request-codes-validation.enum';
import { PlanRequestStatus } from './plan-request-status.enum';
import { PlanRequestValidationMethod } from './plan-request-validation-method.enum';

export interface PlanRequestData {
  status: PlanRequestStatus;
  partner_id: number;
  ticket_types: PlanRequestTicketTypeData[];
  dates: PlanRequestDateData[];
  images: PlanRequestImageData[];
  id: string;
  created_at: string;
  updated_at: string;
  plan_id: number;
  web_url: string;
  plan_name: string;
  plan_description: string;
  city: string;
  address: string;
  accessibility: boolean;
  surcharge_agreed: string;
  closing_sales: string;
  additional_information: string;
  validation_method: PlanRequestValidationMethod;
  codes_type: PlanRequestCodesType;
  codes_validation: PlanRequestCodesValidation;
  codes_file_url: string;
  faq: string;
  terms_and_conditions: string;
  b2b_user: User;
}

export class PlanRequest {
  constructor(
    public status: PlanRequestStatus = PlanRequestStatus.TO_BE_SUBMITTED,
    public partnerId: number,
    public ticketTypes: PlanRequestTicketType[] = [],
    public dates: PlanRequestDate[] = [],
    public images: PlanRequestImage[] = [],
    public id?: string,
    public createdAt?: string,
    public updatedAt?: string,
    public planId?: number,
    public webUrl?: string,
    public planName?: string,
    public planDescription?: string,
    public city?: string,
    public address?: string,
    public accessibility?: boolean,
    public surchargeAgreed?: string,
    public closingSales?: string,
    public additionalInformation?: string,
    public validationMethod?: PlanRequestValidationMethod,
    public codesType?: PlanRequestCodesType,
    public codesValidation?: PlanRequestCodesValidation,
    public codesFileUrl?: string,
    public faq?: string,
    public termsAndConditions?: string,
    public b2bUser?: User,
  ) {}

  checkMandatoryFields(): boolean {
    if (this.ticketTypes.length == 0 || this.dates.length == 0 || this.images.length == 0) {
      return false;
    }
    if (this.planName == undefined || this.planName == '') {
      return false;
    }
    if (this.planDescription == undefined || this.planDescription == '') {
      return false;
    }
    if (this.city == undefined || this.city == '') {
      return false;
    }
    if (this.address == undefined || this.address == '') {
      return false;
    }
    if (this.accessibility == undefined) {
      return false;
    }
    if (this.closingSales == undefined || this.closingSales == '') {
      return false;
    }
    if (this.validationMethod == undefined) {
      return false;
    }
    if (this.validationMethod !== PlanRequestValidationMethod.IN_APP && this.codesType == undefined) {
      return false;
    }
    if (this.validationMethod !== PlanRequestValidationMethod.IN_APP && this.codesValidation == undefined) {
      return false;
    }
    if (this.validationMethod == PlanRequestValidationMethod.PARTNERS_CODES && this.codesFileUrl == undefined) {
      return false;
    }
    if (this.faq == undefined || this.faq == '') {
      return false;
    }
    if (this.termsAndConditions == undefined || this.termsAndConditions == '') {
      return false;
    }
    for (const ticketType of this.ticketTypes) {
      if (!ticketType.checkMandatoryFields()) {
        return false;
      }
    }
    return true;
  }
}
