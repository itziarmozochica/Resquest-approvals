import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { Shift, ShiftSurvey } from '../../../shared/models/shifts.model';
import { ShiftResult, ShiftSurveysUI } from '../../models/shift-surveys-ui.model';

@Component({
  selector: 'app-shift-surveys',
  standalone: false,
  templateUrl: './shift-surveys.component.html',
  styleUrls: ['./shift-surveys.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftSurveysComponent {
  #translateService = inject(TranslateService);

  shiftSurveys: ShiftSurveysUI | null = null;

  @Input() set shift(shift: Shift) {
    this.#updateViewData(shift);
  }

  #updateViewData(shift: Shift) {
    const survey: ShiftSurvey = shift.survey;
    const maxCount: number = this.getMaxCount(survey);
    const totalCount: number = this.getTotalCount(survey);
    const results: ShiftResult[] = this.getResults(survey, maxCount, totalCount);

    this.shiftSurveys = {
      totalCount,
      overallReactionFaceFilePath: results[0].faceFilePath,
      results,
    };
  }

  private getTotalCount(survey: ShiftSurvey): number {
    return survey.positiveCount + survey.neutralCount + survey.negativeCount;
  }

  private getMaxCount(survey: ShiftSurvey): number {
    return Math.max(survey.positiveCount, survey.neutralCount, survey.negativeCount);
  }

  private getResults(survey: ShiftSurvey, maxCount: number, totalCount: number): ShiftResult[] {
    return [
      this.getResult(
        'assets/images/survey/smiling-face.svg',
        this.#translateService.instant('boxOffice.shiftDetail.survey.positive'),
        survey.positiveCount,
        maxCount,
        totalCount,
      ),
      this.getResult(
        'assets/images/survey/neutral-face.svg',
        this.#translateService.instant('boxOffice.shiftDetail.survey.neutral'),
        survey.neutralCount,
        maxCount,
        totalCount,
      ),
      this.getResult(
        'assets/images/survey/frowning-face.svg',
        this.#translateService.instant('boxOffice.shiftDetail.survey.negative'),
        survey.negativeCount,
        maxCount,
        totalCount,
      ),
    ]
      .filter(result => result.value > 0)
      .sort((resultA, resultB) => resultB.value - resultA.value);
  }

  private getResult(filePath: string, name: string, value: number, maxCount: number, totalCount: number): ShiftResult {
    return {
      faceFilePath: filePath,
      name: name,
      value: value,
      maxCount: maxCount,
      percentage: Math.round((value * 100) / totalCount),
    };
  }
}
