import { BlockTextDefaults } from '../_shared/block-text-defaults';
import { normalizeAccentHex } from '../_shared/color.utils';
import { uid } from '../_shared/uid.util';
import { INFO_CARD_ACCENT_DEFAULT_HEX } from './info-card.constants';
import { InfoCard } from './info-card.model';

export function resolveCardAccent(ic: Partial<InfoCard>): string {
  const n = normalizeAccentHex(ic?.accentColor, '');
  return n !== '' ? n : INFO_CARD_ACCENT_DEFAULT_HEX;
}

export function bulletLinesFromCard(ic: Partial<InfoCard>): string[] {
  const t = ic?.bulletPointsText;
  if (typeof t !== 'string') return [];
  return t
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

export function createDefaultInfoCard(defaults: BlockTextDefaults): InfoCard {
  return {
    id: uid(),
    heading: defaults.infoCardHeading,
    price: defaults.infoCardPrice,
    imageSrc: '',
    ctaLabel: defaults.infoCardCtaLabel,
    highlighted: false,
    badge: '',
    accentColor: INFO_CARD_ACCENT_DEFAULT_HEX,
    bulletPointsText: defaults.infoCardBulletPointsText,
  };
}
