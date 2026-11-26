import { inject, Injectable } from '@angular/core';

import { BookingQuestionsCatalogService } from '@fz-original/app/shared/booking-questions-catalog/booking-questions-catalog.service';
import { CustomerQuestionInput } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-input.model';
import {
  CustomerQuestion,
  CustomerQuestionCapabilities,
  CustomerQuestionsPage,
} from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';
import { CustomerQuestionsCatalogQuery } from '@fz-original/app/shared/booking-questions-catalog/models/customer-questions-catalog-query.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { map, Observable, of, switchMap, throwError } from 'rxjs';

import { PartnerAccessLevel } from '../models/partner-access-level.enum';
import { customerQuestionToInput } from '../utils/customer-question-to-input.util';
import {
  capabilitiesFromPartnerAccessLevel,
  DEFAULT_PARTNER_ACCESS_LEVEL,
  partnerAccessLevelFromCapabilities,
} from '../utils/partner-access-level.util';

@Injectable({
  providedIn: 'root',
})
export class CustomerQuestionsCatalogFacade {
  readonly #service = inject(BookingQuestionsCatalogService);
  readonly #partnerService = inject(PartnerService);
  readonly #userService = inject(UserService);

  get canCreate(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_CREATE_BOOKING_QUESTIONS);
  }

  get canEditCapabilities(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_EDIT_BOOKING_QUESTION_CAPABILITIES);
  }

  get canManageTranslations(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_MANAGE_BOOKING_QUESTION_TRANSLATIONS);
  }

  get canModify(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_MODIFY_BOOKING_QUESTIONS);
  }

  get canRemove(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_REMOVE_BOOKING_QUESTIONS);
  }

  get canViewAnswers(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_BOOKING_QUESTION_ANSWERS);
  }

  deleteQuestion(questionId: string): Observable<void> {
    return this.#withPartner(partnerId => this.#service.deleteQuestion(partnerId, questionId));
  }

  duplicateQuestion(source: CustomerQuestion, copiedTitle: string): Observable<string> {
    return this.loadAllowedCapabilities(source.id).pipe(
      switchMap(capabilities =>
        this.writeQuestion(null, customerQuestionToInput(source, copiedTitle)).pipe(
          switchMap(questionId =>
            this.saveCapabilities(questionId, partnerAccessLevelFromCapabilities(capabilities), DEFAULT_PARTNER_ACCESS_LEVEL).pipe(
              map(() => questionId),
            ),
          ),
        ),
      ),
    );
  }

  loadAllowedCapabilities(questionId: string): Observable<CustomerQuestionCapabilities> {
    return this.#withPartner(partnerId => this.#service.getAllowedCapabilities(partnerId, questionId));
  }

  loadCatalog(query: CustomerQuestionsCatalogQuery): Observable<CustomerQuestionsPage> {
    return this.#withPartner(partnerId => this.#service.getCatalog(partnerId, query));
  }

  get partnerName(): string {
    return this.#partnerService.getPartner()?.name ?? '';
  }

  saveCapabilities(questionId: string, level: PartnerAccessLevel | null, originalLevel: PartnerAccessLevel): Observable<unknown> {
    if (level === null || level === originalLevel) {
      return of(undefined);
    }

    return this.#withPartner(partnerId =>
      this.#service.updateAllowedCapabilities(partnerId, questionId, capabilitiesFromPartnerAccessLevel(level)),
    );
  }

  writeQuestion(questionId: string | null, input: CustomerQuestionInput): Observable<string> {
    return this.#withPartner(partnerId =>
      questionId ? this.#service.updateQuestion(partnerId, questionId, input) : this.#service.createQuestion(partnerId, input),
    );
  }

  #withPartner<T>(operation: (partnerId: number) => Observable<T>): Observable<T> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!partnerId) {
      return throwError(() => new Error('Missing partner'));
    }

    return operation(partnerId);
  }
}
