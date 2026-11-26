import { Injectable } from '@angular/core';

import { SeenTrait } from '@fz-original/global';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

import { BaseResponse } from '../../../models/base-response';
import { Partner } from '../../../models/partner/partner.model';
import { Script } from '../script.model';
import { ScriptService } from '../script.service';
import { SurveyReply } from '../survey-reply/models/survey-reply.model';
import { SurveyReplyService } from '../survey-reply/survey-reply.service';
import { VisitorTraits } from './visitor-traits.model';

const SURVICATE_SCRIPT_DATA = {
  type: 'text/javascript',
  src: 'https://survey.survicate.com/workspaces/3f3f6577d09fae886cccdb11c17f37c0/web_surveys.js',
  async: true,
};

@Injectable({
  providedIn: 'root',
})
export class SurvicateService {
  private traits: Record<string, unknown> & SeenTrait = {};
  private survicateUserData!: {
    userId: number;
    partner: Partner;
  };
  private survicateReadyFn!: () => void;

  constructor(
    private scriptService: ScriptService,
    private surveyReplyService: SurveyReplyService,
  ) {}

  run(userId: number, partner: Partner): void {
    this.survicateUserData = {
      userId,
      partner,
    };
    if (this.scriptService.checkIfScriptIsLoaded('survicate')) {
      return;
    }

    this.resetSurvicateWindowsAttributes();
    this.surveyReplyService
      .getSurveyReplies(this.survicateUserData.partner.id, true)
      .pipe(
        mergeMap((response: BaseResponse<Array<SurveyReply> | null>) => {
          if (response?.data) {
            this.updateTargetAudience(response.data);
            this.waitToSurvicateReady();
            return this.loadSurvicateScript();
          }
          return throwError(response?.error || {});
        }),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  private resetSurvicateWindowsAttributes(): void {
    this.traits = {};
    window['_svd'] = undefined;
    window['_svc'] = undefined;
    window['_sva'] = { traits: {} };
  }

  private loadSurvicateScript(): Observable<Event> {
    return this.scriptService.loadScript(
      new Script('survicate', SURVICATE_SCRIPT_DATA.type, SURVICATE_SCRIPT_DATA.src, SURVICATE_SCRIPT_DATA.async),
    );
  }

  private updateTargetAudience(userSurveys: Array<SurveyReply>): void {
    const today = new Date();
    userSurveys.forEach(survey => {
      if (!survey.nextScheduledReplyAt || today < new Date(survey.nextScheduledReplyAt)) {
        this.updateWindowsTraits(survey.externalId);
      }
    });
    this.traits = JSON.parse(JSON.stringify(window['_sva']?.traits));
  }

  private updateWindowsTraits(surveyId: string): void {
    if (!window['_sva']) {
      window['_sva'] = {
        traits: {
          [`${surveyId}_seen`]: true,
        },
      };
    } else {
      window['_sva'].traits[`${surveyId}_seen`] = true;
    }
  }

  private waitToSurvicateReady(): void {
    this.survicateReadyFn = () => {
      if (!this.survicateUserData.userId || !this.survicateUserData.partner) {
        throw new Error(
          'Error in setVisitorTraits: userID = ' + this.survicateUserData.userId + ' and partner = ' + this.survicateUserData.partner,
        );
      }

      window['_sva']?.setVisitorTraits?.(new VisitorTraits(this.survicateUserData.userId, this.survicateUserData.partner));
      this.loadEventListener('survey_closed');
      this.loadEventListener('survey_completed');
    };

    window.addEventListener('SurvicateReady', this.survicateReadyFn, { once: true });
  }

  private loadEventListener(eventName: string): void {
    window['_sva']?.addEventListener?.(eventName, (surveyId: string) => {
      if (Object.keys(this.traits).findIndex(key => key === `${surveyId}_seen`) > -1) {
        return;
      }

      if (window['_sva']?.getState?.()?.backendData?.surveys) {
        const surveyDetails = window?.['_sva']?.getState()?.backendData?.surveys.find(survey => survey.id === surveyId);
        this.traits[`${surveyId}_seen` as `${string}_seen`] = true;
        const recurringPeriod =
          surveyDetails?.settings?.recurring && surveyDetails.settings.recurring_period > 0
            ? surveyDetails?.settings.recurring_period
            : undefined;
        if (!this.survicateUserData.partner.id) {
          throw new Error('Error in createSurveyReply: partner ID is null');
        }
        this.surveyReplyService
          .createSurveyReply(this.survicateUserData.partner.id, this.survicateUserData.userId, surveyId, recurringPeriod)
          .subscribe(
            response => {
              if (response && response.data) {
                this.updateWindowsTraits(response.data.externalId);
              } else {
                (this.traits[`${surveyId}_seen`] as { delete: unknown }).delete;
              }
            },
            () => (this.traits[`${surveyId}_seen`] as { delete: unknown }).delete,
          );
      } else {
        throw new Error('Could not retrieve surveys');
      }
    });
  }

  stop(): void {
    if (!this.scriptService.checkIfScriptIsLoaded('survicate')) {
      return;
    }

    window.removeEventListener('SurvicateReady', this.survicateReadyFn);
    window['_sva']?.removeEventListener?.('survey_displayed');
    window['_sva']?.removeEventListener?.('survey_closed');
    window['_sva']?.removeEventListener?.('survey_completed');
    window['_sva']?.destroyVisitor?.(window['_sva'].retarget);
    delete window['_sva'];
    this.scriptService.removeFromDocument('survicate');
    this.scriptService.removeFromDocument('survicate-box');
    this.scriptService.removeFromDocument('survicate-core-theme');
    this.scriptService.removeScriptByAttribute('src', 'survicate');
  }
}
