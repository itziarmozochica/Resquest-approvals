import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  NgZone,
  signal,
  viewChild,
  type ElementRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';

import { IGNT_DIALOG_REF, IgntButtonComponent, type IgntButtonSentiment, type IgntButtonVariant, type IgntDialogRef } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { MultiStepModalStepHostComponent } from '../../components/multi-step-modal-step-host/multi-step-modal-step-host.component';
import type { MultiStepActionConfig, MultiStepModalResult } from '../../models/multi-step-modal.model';
import { MULTI_STEP_MODAL_CONTROLLER } from '../../tokens/multi-step-modal.token';

const RESERVED_INTENTS: ReadonlySet<string> = new Set<string>(['back', 'cancel', 'close', 'dismiss']);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
  imports: [IgntButtonComponent, IgntIconButtonComponent, MultiStepModalStepHostComponent, TranslateModule],
  selector: 'app-multi-step-modal-shell',
  standalone: true,
  styleUrl: './multi-step-modal-shell.component.scss',
  templateUrl: './multi-step-modal-shell.component.html',
})
export class MultiStepModalShellComponent {
  readonly #dialogRef = inject<IgntDialogRef<MultiStepModalResult>>(IGNT_DIALOG_REF);
  readonly #ngZone = inject(NgZone);
  protected readonly controller = inject(MULTI_STEP_MODAL_CONTROLLER);
  protected readonly progressPercent: Signal<number> = computed<number>(() => Math.round(this.controller.progress() * 100));
  protected readonly sizer = viewChild<ElementRef<HTMLElement>>('sizer');
  protected readonly stepHost = viewChild(MultiStepModalStepHostComponent);
  /**
   * Measured natural height of the content, pinned on the shell so `transition: height` can
   * animate content-driven changes (CSS cannot transition an `auto` height). `null` until the
   * first measurement, which leaves the height to the stylesheet.
   */
  protected readonly sizerHeight: WritableSignal<number | null> = signal<number | null>(null);

  constructor() {
    this.#trackSizerHeight();
  }

  protected actionSentiment(action: MultiStepActionConfig<unknown, string>): IgntButtonSentiment {
    return action.sentiment === 'danger' ? 'danger' : 'brand';
  }

  protected actionVariant(action: MultiStepActionConfig<unknown, string>): IgntButtonVariant {
    return action.kind === 'primary' ? 'primary' : 'secondary';
  }

  protected isActionDisabled(action: MultiStepActionConfig<unknown, string>): boolean {
    if (!this.controller.isActionEnabled(action)) {
      return true;
    }
    if (this.#isReservedIntent(action.intent)) {
      return false;
    }
    return this.stepHost()?.ready() !== true;
  }

  protected onAction(action: MultiStepActionConfig<unknown, string>): void {
    if (this.isActionDisabled(action)) {
      return;
    }
    switch (action.intent) {
      case 'cancel':
        this.#close(false, true);
        break;
      case 'dismiss':
        this.#close(false);
        break;
      case 'close':
        this.#close(true);
        break;
      case 'back':
        this.controller.goBack();
        break;
      default:
        this.controller.transition(action.intent);
    }
  }

  protected onClose(): void {
    this.#close(this.controller.currentStep()?.chrome.closeCompletes === true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.defaultPrevented) {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLButtonElement ||
      target instanceof HTMLAnchorElement ||
      (target instanceof Element && (target.closest('[role="button"]') !== null || target.closest('ignt-button') !== null))
    ) {
      return;
    }
    const primaryAction = this.controller
      .currentStep()
      ?.actions.find(action => action.kind === 'primary' && this.controller.isActionVisible(action));
    if (primaryAction === undefined || this.isActionDisabled(primaryAction)) {
      return;
    }
    event.preventDefault();
    this.onAction(primaryAction);
  }

  #isReservedIntent(intent: string): boolean {
    return RESERVED_INTENTS.has(intent);
  }

  #trackSizerHeight(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      const height = this.sizer()?.nativeElement.offsetHeight ?? null;
      this.#ngZone.run(() => this.sizerHeight.set(height));
    });
    effect(() => {
      const sizer = this.sizer();
      observer.disconnect();
      if (sizer !== undefined) {
        this.#ngZone.runOutsideAngular(() => observer.observe(sizer.nativeElement));
      }
    });
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  #close(completed: boolean, abandoned = false): void {
    this.#dialogRef.close({ abandoned, completed });
  }
}
