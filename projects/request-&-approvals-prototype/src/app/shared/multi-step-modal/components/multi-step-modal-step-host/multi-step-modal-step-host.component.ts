import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type Type,
  type WritableSignal,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import type { MultiStepLoader } from '../../models/multi-step-modal.model';
import { MULTI_STEP_MODAL_CONTROLLER } from '../../tokens/multi-step-modal.token';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, TranslateModule],
  selector: 'app-multi-step-modal-step-host',
  standalone: true,
  styleUrl: './multi-step-modal-step-host.component.scss',
  templateUrl: './multi-step-modal-step-host.component.html',
})
export class MultiStepModalStepHostComponent {
  readonly #controller = inject(MULTI_STEP_MODAL_CONTROLLER);
  readonly #cache = new Map<string, Type<unknown>>();
  readonly #loadedStepId: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly stepComponent: WritableSignal<Type<unknown> | null> = signal<Type<unknown> | null>(null);
  protected readonly loadError: WritableSignal<boolean> = signal<boolean>(false);
  readonly ready: Signal<boolean> = computed<boolean>(() => {
    const step = this.#controller.currentStep();
    return step !== null && this.#loadedStepId() === step.id;
  });
  /**
   * Single-entry collection keyed by the loaded step id: tracking it in the template recreates the
   * step wrapper on every step change, replaying its enter animation so the shell's height
   * transition never shows cropped intermediate content.
   */
  protected readonly activeStep: Signal<{ component: Type<unknown>; id: string }[]> = computed(() => {
    const component = this.stepComponent();
    const id = this.#loadedStepId();
    return component === null || id === null ? [] : [{ component, id }];
  });

  constructor() {
    effect(() => {
      const step = this.#controller.currentStep();
      if (step === null) {
        return;
      }
      void this.#loadStep(step.id, step.loader);
      this.#prefetch(step.prefetch ?? []);
    });
  }

  protected retry(): void {
    const step = this.#controller.currentStep();
    if (step === null) {
      return;
    }
    void this.#loadStep(step.id, step.loader);
  }

  async #loadStep(id: string, loader: MultiStepLoader): Promise<void> {
    this.loadError.set(false);
    const cached = this.#cache.get(id);
    if (cached !== undefined) {
      this.stepComponent.set(cached);
      this.#loadedStepId.set(id);
      return;
    }
    try {
      const type = await loader();
      this.#cache.set(id, type);
      if (this.#controller.currentStep()?.id === id) {
        this.stepComponent.set(type);
        this.#loadedStepId.set(id);
      }
    } catch {
      if (this.#controller.currentStep()?.id === id) {
        this.stepComponent.set(null);
        this.loadError.set(true);
      }
    }
  }

  #prefetch(ids: string[]): void {
    const run = (): void => {
      ids.forEach(id => {
        if (this.#cache.has(id)) {
          return;
        }
        void this.#controller
          .getStep(id)
          .loader()
          .then(type => this.#cache.set(id, type))
          .catch((): undefined => undefined);
      });
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => run());
    } else {
      setTimeout(run, 200);
    }
  }
}
