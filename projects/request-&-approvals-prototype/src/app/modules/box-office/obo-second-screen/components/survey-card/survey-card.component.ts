import { Component, Input } from '@angular/core';

import { OboSecondScreenDataService } from '../../services/obo-second-screen-data.service';
import { RateShiftService } from '../../services/rate-shift.service';

@Component({
  selector: 'app-survey-card',
  standalone: false,
  templateUrl: './survey-card.component.html',
  styleUrls: ['./survey-card.component.scss'],
})
export class SurveyCardComponent {
  @Input() placeId: number;
  @Input() shiftId: string;

  constructor(
    private rateShiftService: RateShiftService,
    private oboSecondScreenDataService: OboSecondScreenDataService,
  ) {}

  onNegativeClick() {
    this.rateShift(-1);
  }

  onNeutralClick() {
    this.rateShift(0);
  }

  onPositiveClick() {
    this.rateShift(1);
  }

  private rateShift(rating: number): void {
    this.rateShiftService.rateShift(this.placeId, this.shiftId, rating).subscribe();
    this.oboSecondScreenDataService.completeSurvey();
  }
}
