import { Injectable } from '@angular/core';

import { Money } from '../../../../../shared/models/money.model';
import { removeEmptyKeys } from '../../../../../shared/utils/object.utils';
import {
  CashRegister,
  CashRegisterDTO,
  PaymentMethodSummary,
  PaymentMethodSummaryDTO,
  Shift,
  ShiftDTO,
  ShiftSurvey,
  ShiftSurveyDTO,
  ShiftUser,
  ShiftUserDTO,
} from '../../models/shifts.model';

@Injectable({
  providedIn: 'root',
})
export class ShiftDTOAdapter {
  parseShiftDTO(dto: ShiftDTO): Shift {
    const optionalFields: Pick<Shift, 'comment' | 'closedAt' | 'complianceCheckoutEnabled'> = {
      comment: dto.comment,
      closedAt: dto.closed_at ? new Date(dto.closed_at) : undefined,
      complianceCheckoutEnabled: dto.compliance_checkout_enabled,
    };

    return {
      id: dto.id,
      oboVenueId: dto.obo_venue_id,
      oboVenueName: dto.obo_venue_name,
      cityId: dto.city_id,
      b2bUser: this.parseUser(dto.b2b_user),
      status: dto.status,
      createdAt: new Date(dto.created_at),
      onsiteSetupId: dto.onsite_setup_id,
      onsiteSetupName: dto.onsite_setup_name,
      cashRegisters: dto.cash_registers.map(cashRegister => this.parseCashRegister(cashRegister)),

      paymentMethodSummaries: dto.payment_method_summaries.map(summary => this.parsePaymentMethodSummaries(summary)),
      survey: this.parseSurvey(dto.surveys),

      ...removeEmptyKeys(optionalFields),
    };
  }

  private parseUser(userDTO: ShiftUserDTO): ShiftUser {
    return {
      b2bUserId: userDTO.b2b_user_id,
      b2bUserName: userDTO.b2b_user_name,
      b2bUserEmail: userDTO.b2b_user_email,
      b2bUserUsername: userDTO.b2b_user_username,
    };
  }

  private parseCashRegister(cashRegisterDTO: CashRegisterDTO): CashRegister {
    const optionalFields: Pick<CashRegister, 'finalAmount' | 'closedAt'> = {
      finalAmount: cashRegisterDTO.final_amount,
      closedAt: cashRegisterDTO.closed_at ? new Date(cashRegisterDTO.closed_at) : undefined,
    };

    return {
      cashRegisterId: cashRegisterDTO.cash_register_id,
      status: cashRegisterDTO.status,
      currency: cashRegisterDTO.currency,
      initialAmount: cashRegisterDTO.initial_amount,
      createdAt: new Date(cashRegisterDTO.created_at),
      name: cashRegisterDTO.name,
      ...removeEmptyKeys(optionalFields),
    };
  }

  private parsePaymentMethodSummaries(summary: PaymentMethodSummaryDTO): PaymentMethodSummary {
    return {
      paymentMethod: summary.payment_method,
      paymentMethodName: summary.payment_method_name ?? null,
      ticketsSoldCount: summary.tickets_sold_count,
      ticketsCancelledCount: summary.tickets_cancelled_count,
      total: new Money(summary.total.amount, summary.total.currency),
    };
  }

  private parseSurvey(survey: ShiftSurveyDTO | undefined): ShiftSurvey | undefined {
    if (!survey) return undefined;

    return {
      positiveCount: survey.positive_count,
      neutralCount: survey.neutral_count,
      negativeCount: survey.negative_count,
    };
  }
}
