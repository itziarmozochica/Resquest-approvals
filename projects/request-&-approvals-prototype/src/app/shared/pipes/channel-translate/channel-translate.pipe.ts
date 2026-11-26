import { TitleCasePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'channelTranslate',
  standalone: false,
})
export class ChannelTranslatePipe implements PipeTransform {
  private translationPrefix = 'orders.channelId.';
  private translatableChannelIds = ['box-office', 'invitation'];
  private translatableChannelTypes = ['box_office', 'invitation', 'b2b_portal', 'affiliate_portal'];
  constructor(
    private titleCasePipe: TitleCasePipe,
    private translate: TranslateService,
  ) {}
  transform(channelId: string, channelName: string): string {
    if (this.translatableChannelIds.indexOf(channelId) >= 0) {
      const translatedValue = this.translate.instant(this.translationPrefix + channelId);
      if (this.translationPrefix + channelId != translatedValue) {
        return translatedValue;
      }
      return this.titleCasePipe.transform(channelId.replace('-', ' '));
    }

    const trimmedName = channelName?.trim();
    if (!trimmedName) {
      return this.translate.instant(`${this.translationPrefix}unknown`, { id: channelId });
    }

    return trimmedName;
  }

  transformType(channelType: string): string {
    const transformedChannelType = channelType.replace('_', '-');
    if (this.translatableChannelTypes.indexOf(channelType) >= 0) {
      const translatedValue = this.translate.instant(this.translationPrefix + transformedChannelType);
      if (this.translationPrefix + transformedChannelType != translatedValue) {
        return translatedValue;
      }
    }
    return this.titleCasePipe.transform(transformedChannelType);
  }
}
