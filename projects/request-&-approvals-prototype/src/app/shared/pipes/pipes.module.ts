import { NgModule } from '@angular/core';

import { AbbreviateNumberPipe } from './abbreviate-number.pipe';
import { AbsoluteValuePipe } from './absolute-value.pipe';
import { ChannelTranslatePipe } from './channel-translate/channel-translate.pipe';
import { CityTranslatePipe } from './city-translate/city-translate.pipe';
import { FindByKeyPipe } from './find-by-key.pipe';
import { HoursToDaysPipe } from './hours-to-days.pipe';
import { IsPlaceholderEmailPipe } from './is-placeholder-email.pipe';
import { IsoDatePipe } from './iso-date.pipe';
import { MomentDatePipe } from './moment-date.pipe';
import { PipeFunction } from './pipe-function.pipe';
import { PluckPipe } from './pluck.pipe';
import { SafeUrlPipe } from './safe-url.pipe';
import { SentenceCasePipe } from './sentence-case.pipe';

@NgModule({
  declarations: [
    MomentDatePipe,
    IsoDatePipe,
    IsPlaceholderEmailPipe,
    AbbreviateNumberPipe,
    ChannelTranslatePipe,
    HoursToDaysPipe,
    PluckPipe,
    FindByKeyPipe,
    PipeFunction,
    AbsoluteValuePipe,
    SentenceCasePipe,
  ],
  exports: [
    MomentDatePipe,
    IsoDatePipe,
    IsPlaceholderEmailPipe,
    AbbreviateNumberPipe,
    SafeUrlPipe,
    CityTranslatePipe,
    ChannelTranslatePipe,
    HoursToDaysPipe,
    PluckPipe,
    FindByKeyPipe,
    PipeFunction,
    AbsoluteValuePipe,
    SentenceCasePipe,
  ],
  imports: [CityTranslatePipe, SafeUrlPipe],
})
export class PipesModule {}
