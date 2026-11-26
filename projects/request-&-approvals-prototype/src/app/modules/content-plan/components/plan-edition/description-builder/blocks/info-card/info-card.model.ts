export interface InfoCard {
  id: string;
  heading: string;
  price: string;
  imageSrc: string;
  ctaLabel: string;
  highlighted: boolean;
  badge: string;
  accentColor: string;
  /** One bullet per line — split on `\n` when rendering. */
  bulletPointsText: string;
}

export interface InfoCardProps {
  cards: InfoCard[];
}
