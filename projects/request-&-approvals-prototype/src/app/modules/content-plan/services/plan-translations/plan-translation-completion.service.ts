import { inject, Injectable } from '@angular/core';

import { PlanDetailService } from '@fz-original/app/shared/services/plan/plan-detail.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { PlanSessionType } from '../../models/plan-session-types.model';
import { TranslationEntity } from '../../models/plan-translation.model';
import { SessionTypeTranslation } from '../../models/session-type-translation.model';
import { computeManageableChannelIds } from '../../utils/manageable-channels.util';
import { computePlanTranslationLanguageStatuses, isPlanTranslationComplete } from '../../utils/plan-translation-completeness.util';
import { selectTranslatableSessionTypes } from '../../utils/select-translatable-session-types.util';
import { PlanTranslationsService } from './plan-translations.service';

@Injectable({
  providedIn: 'root',
})
export class PlanTranslationCompletionService {
  readonly #planTranslationsService = inject(PlanTranslationsService);
  readonly #planDetailService = inject(PlanDetailService);
  readonly #userService = inject(UserService);

  isPlanTranslationComplete$(partnerId: number, planId: number): Observable<boolean> {
    return forkJoin({
      partnerChannels: this.#planTranslationsService.getPartnerAvailableChannels(partnerId),
      planDetail: this.#planDetailService.getPlanDetail(partnerId, planId),
      planSessionTypes: this.#planTranslationsService.getPlanSessionTypes(partnerId, planId),
      translations: this.#planTranslationsService.getPlanTranslations(partnerId, TranslationEntity.MAIN_PLAN, planId),
    }).pipe(
      switchMap(({ partnerChannels, planDetail, planSessionTypes, translations }) => {
        const manageableChannelIds = computeManageableChannelIds(partnerChannels, planDetail.channels ?? [], planSessionTypes);
        const translatableSessionTypes = selectTranslatableSessionTypes(planDetail.type ?? '', planSessionTypes);
        const baseInput = {
          baseLocale: planDetail.baseLocale ?? '',
          configuredLocales: planDetail.translationLanguages ?? [],
          manageableChannelIds,
          originalLabelFormat: this.#userService.hasPermission(Permissions.CAN_MANAGE_LABEL_FORMAT_TRANSLATIONS)
            ? (planDetail.labelFormat ?? '')
            : '',
          originalShortDescription: planDetail.shortDescription ?? '',
          translations: translations.data ?? [],
        };

        const eventStatuses = computePlanTranslationLanguageStatuses({
          ...baseInput,
          planSessionTypes: [],
          sessionTypeTranslationsByEntityId: new Map<number, readonly SessionTypeTranslation[]>(),
        });
        if ([...eventStatuses.values()].includes('missing')) {
          return of(false);
        }

        return this.#loadSessionTypeTranslations(partnerId, translatableSessionTypes).pipe(
          map(sessionTypeTranslationsByEntityId =>
            isPlanTranslationComplete({ ...baseInput, planSessionTypes: translatableSessionTypes, sessionTypeTranslationsByEntityId }),
          ),
        );
      }),
    );
  }

  #loadSessionTypeTranslations(
    partnerId: number,
    sessionTypes: readonly PlanSessionType[],
  ): Observable<ReadonlyMap<number, readonly SessionTypeTranslation[]>> {
    if (sessionTypes.length === 0) {
      return of(new Map<number, readonly SessionTypeTranslation[]>());
    }
    return forkJoin(
      sessionTypes.map((sessionType: PlanSessionType) =>
        this.#planTranslationsService
          .getSessionTypeTranslations(partnerId, sessionType.id)
          .pipe(map(response => ({ id: sessionType.id, translations: response.data ?? [] }))),
      ),
    ).pipe(
      map((entries: { id: number; translations: SessionTypeTranslation[] }[]) => {
        const byEntityId = new Map<number, readonly SessionTypeTranslation[]>();
        for (const entry of entries) {
          byEntityId.set(entry.id, entry.translations);
        }
        return byEntityId;
      }),
    );
  }
}
