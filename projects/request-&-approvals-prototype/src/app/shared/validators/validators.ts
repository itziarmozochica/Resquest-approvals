import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { Subscription } from 'rxjs';

export class AppValidators {
  static confirmField(field: string): ValidatorFn {
    let subscription: Subscription | undefined;

    return (control: AbstractControl) => {
      if (!control.parent) {
        return null;
      }

      const mainControl = control.parent.get(field);

      if (subscription === undefined) {
        subscription = mainControl?.valueChanges.subscribe(() => control.updateValueAndValidity());
      }

      if (!!mainControl?.value && !!control.value && mainControl.value !== control.value) {
        return { confirmField: true };
      }

      return null;
    };
  }

  static noSpecialCharactersValidator(): ValidatorFn {
    return AppValidators.regexValidator(new RegExp('^[-a-zA-Z0-9_]*$'), { noSpecialCharacter: true });
  }

  static noValidCharactersValidator(): ValidatorFn {
    const NOT_ISO_8859_15_CHARS_REGEX = new RegExp(
      '^((?![^\x20-\x7E\xA0-\xA3\xA5\xA7\xA9-\xB3\xB5-\xB7\xB9-\xBB\xBF-\xFF\u20AC\u0160\u0161\u017D\u017E\u0152\u0153\u0178]).)*$',
    );
    return AppValidators.regexValidator(NOT_ISO_8859_15_CHARS_REGEX, { noValidCharacters: true });
  }

  static oneDigitValidator(): ValidatorFn {
    return AppValidators.regexValidator(new RegExp('^(?=.*\\d){1,}'), { digit: true });
  }

  static oneSpecialCharacterValidator(): ValidatorFn {
    return AppValidators.regexValidator(new RegExp('^(?=.*[@$!%*#?&]){1,}'), { specialCharacter: true });
  }

  static oneUpperCaseValidator(): ValidatorFn {
    return AppValidators.regexValidator(new RegExp('^(?=.*[A-Z]){1,}'), { upperCase: true });
  }

  private static regexValidator(regex: RegExp, error: ValidationErrors): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null;
      }
      const valid = regex.test(control.value);
      return valid ? null : error;
    };
  }
}
