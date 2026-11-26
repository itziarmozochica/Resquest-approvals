import { inject, Injectable } from '@angular/core';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { MainPlanQuestionsService } from '@fz-original/app/shared/main-plan-questions/main-plan-questions.service';
import { MainPlanQuestionInput } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question-input.model';
import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { ChannelsService } from '@fz-original/app/shared/services/channel/channels.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { SessionTypeService } from '@fz-original/app/shared/services/sessions/session-type.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { defer, forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const SESSION_TYPES_PAGE_SIZE = 100;

export interface MainPlanQuestionsData {
  channelOptions: SelectOption[];
  questions: MainPlanQuestion[];
  sessionTypeOptions: SelectOption[];
}

@Injectable({
  providedIn: 'root',
})
export class EventCustomerQuestionsFacade {
  readonly #mainPlanQuestionsService = inject(MainPlanQuestionsService);
  readonly #sessionTypeService = inject(SessionTypeService);
  readonly #channelsService = inject(ChannelsService);
  readonly #partnerService = inject(PartnerService);
  readonly #userService = inject(UserService);

  get canAssign(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_ASSIGN_BOOKING_QUESTIONS);
  }

  get canCreate(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_CREATE_BOOKING_QUESTIONS);
  }

  get canViewAnswers(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_BOOKING_QUESTION_ANSWERS);
  }

  deleteQuestion(mainPlanId: number, mainPlanQuestionId: number): Observable<void> {
    return this.#withPartner(partnerId => this.#mainPlanQuestionsService.deleteMainPlanQuestion(partnerId, mainPlanId, mainPlanQuestionId));
  }

  loadQuestions(mainPlanId: number): Observable<MainPlanQuestionsData> {
    return this.#withPartner(partnerId =>
      forkJoin({
        channelOptions: this.#loadChannelOptions(partnerId),
        questions: this.#mainPlanQuestionsService.getMainPlanQuestions(partnerId, mainPlanId),
        sessionTypeOptions: this.#loadSessionTypeOptions(mainPlanId),
      }),
    );
  }

  get partnerId(): number {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!partnerId) {
      throw new Error('Missing partner');
    }

    return partnerId;
  }

  updateQuestion(mainPlanId: number, mainPlanQuestionId: number, input: MainPlanQuestionInput): Observable<number> {
    return this.#withPartner(partnerId =>
      this.#mainPlanQuestionsService.updateMainPlanQuestion(partnerId, mainPlanId, mainPlanQuestionId, input),
    );
  }

  #loadChannelOptions(partnerId: number): Observable<SelectOption[]> {
    return this.#channelsService.getChannels(partnerId).pipe(
      map(response => (response.data ?? []).map(channel => ({ id: channel.id, title: channel.name ?? '' }))),
      catchError(() => of<SelectOption[]>([])),
    );
  }

  #loadSessionTypeOptions(mainPlanId: number): Observable<SelectOption[]> {
    return this.#sessionTypeService.getSessionTypesByPlanId(mainPlanId, { page: 1, pageSize: SESSION_TYPES_PAGE_SIZE }).pipe(
      map(response => (response.data ?? []).map(sessionType => ({ id: sessionType.id, title: sessionType.label }))),
      catchError(() => of<SelectOption[]>([])),
    );
  }

  #withPartner<T>(operation: (partnerId: number) => Observable<T>): Observable<T> {
    return defer(() => operation(this.partnerId));
  }
}
