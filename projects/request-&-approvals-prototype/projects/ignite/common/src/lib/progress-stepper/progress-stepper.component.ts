import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model, output, type Signal } from '@angular/core';

import { IgntButtonComponent } from '../actions/button/button.component';
import type { IgntButtonIcon } from '../actions/button/models/button.model';
import { IgntProgressStepperHeaderComponent } from './components/header/progress-stepper-header.component';
import { IgntProgressStepperTrackDotComponent } from './components/track-dot/progress-stepper-track-dot.component';
import type {
  IgntProgressStepperItem,
  IgntProgressStepperItemActivate,
  IgntProgressStepperItemState,
  IgntProgressStepperViewItem,
} from './models/progress-stepper.model';
import { clampProgressStepperCurrentIndex, formatStepCountLabel, resolveProgressStepperItemState } from './utils/progress-stepper.util';

/**
 * Guides the user through a linear, multi-step task one step at a time, showing how far along
 * they are and how much is left.
 *
 * ### When to use
 * - A task with three or more ordered stages the user completes in sequence (plan creation,
 *   checkout, onboarding, ...)
 * - Each stage carries enough of its own UI to deserve the whole view
 * - Knowing the position in the flow matters more than knowing what every step is called
 *
 * ### When NOT to use
 * - One or two straightforward stages → the ceremony costs the user more than it helps
 * - The number of steps changes as the user goes → the track draws one dot per step, so it would
 *   shift under them mid-flow
 * - The flow runs long enough that the track stops reading as a glance-able position (past
 *   roughly a dozen steps the dots also start to spill past the container)
 * - Every step's label should stay on screen, so the user can size up the whole journey before
 *   starting or move between named steps → that is the all-steps-visible stepper. → [Stepper](?path=/story/components-others-stepper--default)
 * - Views the user may visit in any order → use [Tabs](?path=/docs/components-navigation-tabs--docs)
 * - Showing where a page sits in a hierarchy → use [Breadcrumb](?path=/docs/components-navigation-breadcrumb--docs)
 *
 * ### Related
 * - [Breadcrumb](?path=/docs/components-navigation-breadcrumb--docs) — hierarchical navigation, not a wizard
 * - [Tabs](?path=/docs/components-navigation-tabs--docs) — unordered views the user switches between
 * - [Button](?path=/docs/components-actions-button--docs) — Back and Next actions
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntProgressStepperHeaderComponent, IgntProgressStepperTrackDotComponent],
  selector: 'ignt-progress-stepper',
  standalone: true,
  styleUrl: './progress-stepper.component.scss',
  templateUrl: './progress-stepper.component.html',
})
export class IgntProgressStepperComponent {
  static readonly backIcon: IgntButtonIcon = { name: 'chevron-left', variant: 'solid' };
  static readonly nextIcon: IgntButtonIcon = { name: 'chevron-right', variant: 'solid' };

  /**
   * Ordered list of steps. Any number renders: mobile replaces the track with a “Step X of Y”
   * count, which scales freely, while the desktop track draws one dot per step and starts to
   * spill past the container beyond roughly a dozen steps at the width where the track appears.
   */
  readonly items = input.required<IgntProgressStepperItem[]>();

  /**
   * Zero-based index of the current step. Two-way bindable (`[(currentIndex)]`).
   */
  readonly currentIndex = model(0);

  /**
   * When false, completed / active / error track dots are non-interactive. Upcoming dots are
   * always non-interactive. Defaults to true.
   */
  readonly allowItemActivate = input(true, { transform: booleanAttribute });

  /**
   * Accessible name for the stepper group.
   */
  readonly ariaLabel = input<string>('Progress stepper');

  /**
   * Label of the Back button. Pass a translated string from the host.
   */
  readonly backLabel = input<string>('Back');

  /**
   * Whether the whole stepper is disabled. Blocks Back, Next, and track-dot activation.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Extra disable for Next (e.g. the current step's form is invalid). Independent of Back.
   */
  readonly nextDisabled = input(false, { transform: booleanAttribute });

  /**
   * Label of the Next button. Pass a translated string from the host.
   */
  readonly nextLabel = input<string>('Next');

  /**
   * When true, Back and Next are rendered. Next is disabled on the last step, so hosts that need a
   * Finish action there, or supply their own footer, should set this to false.
   */
  readonly showNavigation = input(true, { transform: booleanAttribute });

  /**
   * When true, desktop shows the dot track and mobile shows “Step X of Y”. When false, both are hidden.
   */
  readonly showStepTrack = input(true, { transform: booleanAttribute });

  /**
   * Mobile step-count template. `{{current}}` and `{{total}}` are interpolated. Pass a translated string.
   */
  readonly stepCountLabel = input<string>('Step {{current}} of {{total}}');

  /**
   * Emitted when Back is activated. The component also decrements `currentIndex` when it is greater than 0.
   */
  readonly back = output();

  /**
   * Emitted when a clickable track dot other than the current step is activated. The component
   * also writes `currentIndex`. Re-activating the current step is a no-op.
   */
  readonly itemActivate = output<IgntProgressStepperItemActivate>();

  /**
   * Emitted when Next advances to the next step; the component increments `currentIndex` first.
   * Next is disabled on the last step, and an out-of-range `currentIndex` is recovered silently,
   * so the output only ever reports a step the user actually moved to.
   */
  readonly next = output();

  protected readonly backIcon: IgntButtonIcon = IgntProgressStepperComponent.backIcon;
  protected readonly nextIcon: IgntButtonIcon = IgntProgressStepperComponent.nextIcon;

  protected readonly resolvedCurrentIndex: Signal<number> = computed(() =>
    clampProgressStepperCurrentIndex(this.currentIndex(), this.items().length),
  );

  protected readonly viewItems: Signal<IgntProgressStepperViewItem[]> = computed(() => {
    const items: IgntProgressStepperItem[] = this.items();
    const currentIndex: number = this.resolvedCurrentIndex();
    const lastIndex: number = items.length - 1;
    return items.map((item: IgntProgressStepperItem, index: number) => {
      const state: IgntProgressStepperItemState = resolveProgressStepperItemState(index, currentIndex, item.hasError === true);
      return {
        ariaLabel: item.ariaLabel ?? item.label,
        hasDescription: item.description !== undefined && item.description.length > 0,
        index,
        // The connector leaves this dot toward the next one, so it counts as walked only once the
        // user is past this step, whatever the step's own state (an active or errored step ahead
        // must not light the segment after it).
        isConnectorReached: index < currentIndex,
        isInteractive: this.allowItemActivate() && state !== 'upcoming',
        item,
        showConnector: index < lastIndex,
        state,
        stepNumber: index + 1,
      };
    });
  });

  protected readonly currentViewItem: Signal<IgntProgressStepperViewItem | null> = computed(() => {
    const viewItems: IgntProgressStepperViewItem[] = this.viewItems();
    if (viewItems.length === 0) {
      return null;
    }
    return viewItems[this.resolvedCurrentIndex()];
  });

  protected readonly stepCountText: Signal<string> = computed(() =>
    formatStepCountLabel(this.stepCountLabel(), this.resolvedCurrentIndex() + 1, this.items().length),
  );

  protected readonly isBackDisabled: Signal<boolean> = computed(() => this.disabled() || this.resolvedCurrentIndex() <= 0);

  protected readonly isNextDisabled: Signal<boolean> = computed(
    () => this.disabled() || this.nextDisabled() || this.resolvedCurrentIndex() >= this.items().length - 1,
  );

  protected onBack(): void {
    if (this.isBackDisabled()) {
      return;
    }
    this.currentIndex.set(this.resolvedCurrentIndex() - 1);
    this.back.emit();
  }

  protected onItemActivate(viewItem: IgntProgressStepperViewItem): void {
    if (
      this.allowItemActivate() === false ||
      this.disabled() ||
      viewItem.isInteractive === false ||
      viewItem.index === this.resolvedCurrentIndex()
    ) {
      return;
    }
    this.currentIndex.set(viewItem.index);
    this.itemActivate.emit({ index: viewItem.index, item: viewItem.item });
  }

  protected onNext(): void {
    if (this.isNextDisabled()) {
      return;
    }
    const resolvedIndex: number = this.resolvedCurrentIndex();
    if (this.currentIndex() !== resolvedIndex) {
      // A host index outside the step range is recovered to the step on screen, from the resolved
      // index so it takes a single activation however far out it is. Nothing the user can see
      // moves, so this is not a "next" and the output stays quiet.
      this.currentIndex.set(resolvedIndex);
      return;
    }
    this.currentIndex.set(resolvedIndex + 1);
    this.next.emit();
  }
}
