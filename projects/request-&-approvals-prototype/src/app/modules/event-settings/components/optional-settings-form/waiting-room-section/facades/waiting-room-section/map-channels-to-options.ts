import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { Channel } from '@fz-original/app/shared/models/channel/channel.model';

import { feverMarketplaceOption } from '../../waiting-room-section.constants';

function sortOptionsByTitle(options: SelectOption[]): SelectOption[] {
  return [...options].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

export function mapChannelsToOptions(data: Channel[] | null): SelectOption[] {
  if (data?.length) {
    const options = data.map(({ id, name }) => ({
      id,
      title: name ?? '',
    }));
    const hasFeverMarketplace = options.some(o => o.id === feverMarketplaceOption.id);
    const list = hasFeverMarketplace ? options : [feverMarketplaceOption, ...options];
    return sortOptionsByTitle(list);
  }

  return [feverMarketplaceOption];
}
