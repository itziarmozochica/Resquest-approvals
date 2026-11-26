import { EMPTY_TEXT_DEFAULTS } from '../_shared/block-text-defaults';
import { normalizeAccentHex } from '../_shared/color.utils';
import { asBoolean, asNonEmptyString, asString, isRecord } from '../_shared/dto-codec.util';
import { uid } from '../_shared/uid.util';
import { INFO_CARD_ACCENT_DEFAULT_HEX } from './info-card.constants';
import { createDefaultInfoCard } from './info-card.helpers';
import { InfoCard, InfoCardProps } from './info-card.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface InfoCardDTO {
  id: string;
  heading: string;
  price: string;
  image_src: string;
  cta_label: string;
  highlighted: boolean;
  badge: string;
  accent_color: string;
  bullet_points_text: string;
}

export interface InfoCardPropsDTO {
  cards: InfoCardDTO[];
}

export function infoCardPropsFromDto(raw: Record<string, unknown>): InfoCardProps {
  const rawCards = Array.isArray(raw['cards']) ? raw['cards'] : [];
  const cards = rawCards.filter(isRecord).map(
    (c): InfoCard => ({
      id: asNonEmptyString(c['id'], uid),
      heading: asString(c['heading']),
      price: asString(c['price']),
      imageSrc: asString(c['image_src']),
      ctaLabel: asString(c['cta_label']),
      highlighted: asBoolean(c['highlighted']),
      badge: asString(c['badge']),
      accentColor: normalizeAccentHex(c['accent_color'], INFO_CARD_ACCENT_DEFAULT_HEX),
      bulletPointsText: asString(c['bullet_points_text']),
    }),
  );
  // An info-card block must always expose at least one card: the editor edits
  // cards in place (`updateCard` maps over this array) and mandatory-field
  // validation only walks existing cards, so an empty wire list would both
  // silently drop edits and let an empty block pass publish validation.
  return { cards: cards.length > 0 ? cards : [createDefaultInfoCard(EMPTY_TEXT_DEFAULTS)] };
}

export function infoCardPropsToDto(p: InfoCardProps): InfoCardPropsDTO {
  return {
    cards: p.cards.map(
      (c): InfoCardDTO => ({
        id: c.id,
        heading: c.heading,
        price: c.price,
        image_src: c.imageSrc,
        cta_label: c.ctaLabel,
        highlighted: c.highlighted,
        badge: c.badge,
        accent_color: normalizeAccentHex(c.accentColor, INFO_CARD_ACCENT_DEFAULT_HEX),
        bullet_points_text: c.bulletPointsText,
      }),
    ),
  };
}
