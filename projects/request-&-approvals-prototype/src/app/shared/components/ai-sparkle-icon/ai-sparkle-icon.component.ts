import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

/**
 * Three-tier size scale specific to this component, intentionally narrower than the
 * design-system `IgntIconSize`. The sparkle is a brand asset that only really makes
 * sense at a few discrete sizes — exposing all eight icon-system sizes was both
 * over-flexible and broken (the inner `font-size` override silently capped every
 * consumer at 11px regardless of the chosen size).
 *
 * - `small` (default): 11px, for inline / list-row use.
 * - `medium`: 16px, for pairing with body-copy CTAs and badges.
 * - `large`: 24px, for prominent buttons and entry points.
 */
export type AiSparkleIconSize = 'small' | 'medium' | 'large';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.app-ai-sparkle-icon--size-large]': "size() === 'large'",
    '[class.app-ai-sparkle-icon--size-medium]': "size() === 'medium'",
  },
  imports: [IgntIconComponent],
  selector: 'app-ai-sparkle-icon',
  standalone: true,
  styleUrl: './ai-sparkle-icon.component.scss',
  templateUrl: './ai-sparkle-icon.component.html',
})
export class AiSparkleIconComponent {
  /** `'gradient'` uses palette primary → accent; any other string is applied as a solid CSS `fill`. */
  readonly fill = input<'gradient' | string>('gradient');
  /**
   * Visual size tier. `small` is the default to preserve historical sizing for the
   * inline/list-row consumers that pre-dated this input.
   */
  readonly size = input<AiSparkleIconSize>('small');

  protected readonly gradientId = `ai-sparkle-gradient-${crypto.randomUUID()}`;
  protected readonly iconFillStyle = computed(() => {
    const fillValue = this.fill();
    return fillValue === 'gradient' ? `url(#${this.gradientId})` : fillValue;
  });
  protected readonly showGradientDefs = computed(() => this.fill() === 'gradient');
}
