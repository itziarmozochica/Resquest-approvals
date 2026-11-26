import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { SharedComponentsModule } from '../../../shared/components/shared-components.module';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PipesModule } from '../../../shared/pipes/pipes.module';
import { AsideCoverComponent } from './components/aside-cover/aside-cover-component';
import { BannerCardComponent } from './components/barner-card/banner-card.component';
import { CartItemComponent } from './components/cart/cart-item/cart-item.component';
import { CartComponent } from './components/cart/cart/cart.component';
import { ContactInformationComponent } from './components/contact-information/contact-information.component';
import { FeedbackMessageComponent } from './components/feedback-message/feedback-message.component';
import { OboSecondScreenComponent } from './components/obo-second-screen.component';
import { PinpadMessageComponent } from './components/pinpad-message/pinpad-message.component';
import { SeatingMapComponent } from './components/seating-map/seating-map.component';
import { SurveyCardComponent } from './components/survey-card/survey-card.component';

@NgModule({
  imports: [
    CommonModule,
    IgntIconComponent,
    SharedComponentsModule,
    TranslateModule,
    PipesModule,
    SeatingMapComponent,
    ContactInformationComponent,
    MoneyPipe,
    BannerCardComponent,
  ],
  declarations: [
    OboSecondScreenComponent,
    AsideCoverComponent,
    CartComponent,
    CartItemComponent,
    SurveyCardComponent,
    FeedbackMessageComponent,
    PinpadMessageComponent,
  ],
})
export class OboSecondScreenModule {}
