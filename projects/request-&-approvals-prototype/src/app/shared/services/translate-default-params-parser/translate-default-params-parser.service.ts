import { inject, Injectable } from '@angular/core';

import { TranslateDefaultParser } from '@ngx-translate/core';

import { TranslationKeyRecorderService } from '../../../core/i18n/translation-key-recorder.service';
import { PartnerConfigService } from '../partner-config/partner-config.service';

@Injectable()
export class TranslateDefaultParamsParser extends TranslateDefaultParser {
  readonly #translationKeyRecorder = inject(TranslationKeyRecorderService);
  #isInterpolating = false;

  constructor(private partnerConfigService: PartnerConfigService) {
    super();
  }

  getValue(target: unknown, key: string): unknown {
    const value: unknown = super.getValue(target, key);

    if (!this.#isInterpolating && value !== undefined) {
      this.#translationKeyRecorder.record(key);
    }

    return value;
  }

  interpolate(expr: string | Function, params?: any): string {
    const supportEmail = this.partnerConfigService.supportEmailLink;

    let paramsCopy = params ?? {};
    if (Boolean(paramsCopy) && paramsCopy.constructor === Object) {
      paramsCopy['supportEmailLink'] = supportEmail;
    } else {
      paramsCopy = { supportEmailLink: supportEmail };
    }

    this.#isInterpolating = true;
    try {
      return super.interpolate(expr, paramsCopy);
    } finally {
      this.#isInterpolating = false;
    }
  }
}
