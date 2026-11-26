import { uid } from '../_shared/uid.util';
import { BlockDefinition } from '../block-definition';
import { infoCardPropsFromDto, infoCardPropsToDto } from './info-card.dto';
import { INFO_CARD_FIELDS } from './info-card.field-contract';
import { createDefaultInfoCard } from './info-card.helpers';
import { INFO_CARD_I18N } from './info-card.i18n-keys';

export const INFO_CARD_BLOCK: BlockDefinition<'infoCard'> = {
  type: 'infoCard',
  icon: 'sell',
  labelKey: INFO_CARD_I18N.componentLabel,
  createDefaultProps: defaults => ({ cards: [createDefaultInfoCard(defaults)] }),
  cloneProps: props => ({
    ...props,
    cards: props.cards.map(c => ({ ...c, id: uid() })),
  }),
  dtoType: 'info_card',
  fromDto: infoCardPropsFromDto,
  toDto: infoCardPropsToDto,
  fields: INFO_CARD_FIELDS,
};
