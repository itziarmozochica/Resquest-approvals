import { ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';

import { BookingQuestion, TelTypeCountryCode } from '../../../models';
import { TelTypePhoneService } from '../../form-group/tel-type/tel-type-phone.service';
import { QuestionItemComponent } from '../question-item.component';

@Component({
  selector: 'fv-time-question-item',
  standalone: false,
  templateUrl: './tel-question-item.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelQuestionItemComponent extends QuestionItemComponent implements OnInit {
  @Input() override formGroup!: UntypedFormGroup;
  @Input() override question!: BookingQuestion;
  @Input() override controlId!: string;

  countryCodes!: Array<TelTypeCountryCode>;
  readonly PHONE_ERRORS = [
    { name: 'required', message: 'bookingQuestionsForm.validations.required' },
    { name: 'tel', message: 'bookingQuestionsForm.validations.phoneFormat' },
    { name: 'country', message: 'bookingQuestionsForm.validations.noCountrySelected' },
    { name: 'server', message: 'bookingQuestionsForm.error.rejectedByServer' },
  ];
  private readonly ORDERED_COUNTRIES = [
    { code: 'es', order: 1 },
    { code: 'pt', order: 2 },
    { code: 'fr', order: 3 },
    { code: 'gb', order: 4 },
    { code: 'it', order: 5 },
    { code: 'de', order: 6 },
  ];

  constructor(private phoneService: TelTypePhoneService) {
    super();
  }

  ngOnInit(): void {
    this.phoneService.countryCodes().subscribe(countryCodesResponse => (this.countryCodes = countryCodesResponse));
  }

  getControlError(control: AbstractControl): string | null | undefined {
    if (!this.formGroup.touched) {
      return null;
    }
    const priority = ['required', 'tel', 'country', 'server'];
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

    return errors.length > 0 ? errors.shift() : null;
  }

  private relocateChoices(countryCodesResponse: TelTypeCountryCode[]): Array<TelTypeCountryCode> {
    const newCountryCodes: Array<TelTypeCountryCode> = [];
    this.ORDERED_COUNTRIES.forEach(country => {
      const countryToMove: TelTypeCountryCode | undefined = countryCodesResponse.find(c => c.id === country.code);
      if (countryToMove) {
        countryCodesResponse.splice(countryCodesResponse.indexOf(countryToMove), 1);
        newCountryCodes[country.order - 1] = countryToMove;
      }
    });

    return newCountryCodes.concat(countryCodesResponse);
  }
}
