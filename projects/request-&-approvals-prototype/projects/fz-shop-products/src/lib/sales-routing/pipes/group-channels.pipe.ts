import { Pipe, PipeTransform } from '@angular/core';

import type { Channel } from '../models/sales-routing.model';

@Pipe({
  name: 'groupChannels',
  pure: true,
  standalone: true,
})
export class GroupChannelsPipe implements PipeTransform {
  transform(channels: Channel[], channelsCountLabel: string): string {
    if (channels.length === 0) {
      return '—';
    }

    if (channels.length === 1) {
      return channels[0].name;
    }

    return channelsCountLabel.replace('{{count}}', String(channels.length));
  }
}
