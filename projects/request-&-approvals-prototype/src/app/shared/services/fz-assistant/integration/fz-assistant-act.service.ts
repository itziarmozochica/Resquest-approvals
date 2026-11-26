import { afterNextRender, AfterRenderRef, inject, Injectable, InjectionToken, Injector } from '@angular/core';
import { Router } from '@angular/router';

import {
  AssistantApplyValue,
  AssistantFillResult,
  AssistantWidgetState,
  FzAssistantCapable,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { FzAssistantRegisteredHost } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-host.model';
import {
  FzAssistantActService as FzAssistantActServiceContract,
  FzAssistantActSettleConfig,
  readActionStepRef,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-integration.model';
import {
  ActionStep,
  ExecutionResult,
  FzAssistantActErrorCode,
  FzAssistantClickActionStep,
  FzAssistantFillActionStep,
  FzAssistantNavigateActionStep,
  FzAssistantSubmitActionStep,
  FzAssistantTriggerActionStep,
  FzAssistantViewContext,
  FzAssistantWireValue,
  StepResult,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import {
  findNearestCapable,
  isFzAssistantKnownCapableTag,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-candidate-matcher';
import { isFzAssistantElementUnavailable } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-disabled-state.util';
import {
  readFzAssistantNativeClearValue,
  readFzAssistantNativeValue,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-value.util';
import { isFzAssistantSecretField } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-secret-redaction.util';
import * as Sentry from '@sentry/angular';

import { FZ_ASSISTANT_CAPTURE_CONFIG } from '../discover/fz-assistant-capture.service';
import { FzAssistantDiscoverFacade } from '../discover/fz-assistant-discover.facade';
import { FzAssistantRefRegistryService } from '../discover/fz-assistant-ref-registry.service';
import { FzAssistantHostRegistryService } from '../host/fz-assistant-host-registry.service';
import { FzAssistantWidgetRegistryService } from '../widget/fz-assistant-widget-registry.service';
import { FzAssistantConfirmationGateService } from './fz-assistant-confirmation-gate.service';
import { FzAssistantNativeControlAdapterService } from './fz-assistant-native-control-adapter.service';
import { isNativeControlBlockedForWrite } from './native/fz-assistant-native-control.util';

export const FZ_ASSISTANT_ACT_SETTLE_CONFIG = new InjectionToken<FzAssistantActSettleConfig>('FZ_ASSISTANT_ACT_SETTLE_CONFIG', {
  factory: () => ({ maxRenderWaits: 3, renderTimeoutMs: 50 }),
  providedIn: 'root',
});

type FzAssistantHostCallback = (args?: Record<string, unknown>) => void | Promise<void>;

/** The widget's own verdict on whether Act may write to it, read from one snapshot (§3.4 parity). */
function isBlockedByState(state: AssistantWidgetState): boolean {
  return state.isDisabled === true || state.isReadonly === true;
}

/**
 * One read of a widget's state, and whether the widget managed to give it.
 *
 * The two are separate because the write path and the click path answer a failed read differently, and
 * §3.6 gives `widget_not_capable` to exactly one of them.
 */
interface FzAssistantCapableStateRead {
  hasFailed: boolean;
  state: AssistantWidgetState;
}

interface FzAssistantActTarget {
  element: Element;
  /**
   * The element the gates read and the write lands on: the capable host when the ref resolves inside
   * one, the ref'd element otherwise. A capable host answers for its whole subtree, so an inner
   * control's own `readonly` is not the state capture published for this ref.
   */
  writeTarget: Element;
  capable?: FzAssistantCapable;
}

type FzAssistantActTargetResolution =
  | { ok: true; target: FzAssistantActTarget }
  | { ok: false; error: Extract<FzAssistantActErrorCode, 'target_not_found' | 'target_stale'> };

@Injectable({
  providedIn: 'root',
})
export class FzAssistantActService implements FzAssistantActServiceContract {
  readonly #captureConfig = inject(FZ_ASSISTANT_CAPTURE_CONFIG);
  readonly #confirmationGate = inject(FzAssistantConfirmationGateService);
  readonly #discover = inject(FzAssistantDiscoverFacade);
  readonly #hosts = inject(FzAssistantHostRegistryService);
  readonly #nativeControlAdapter = inject(FzAssistantNativeControlAdapterService);
  readonly #injector = inject(Injector);
  readonly #optimizely = inject(OptimizelyService);
  readonly #refs = inject(FzAssistantRefRegistryService);
  readonly #router = inject(Router);
  readonly #settleConfig = inject(FZ_ASSISTANT_ACT_SETTLE_CONFIG);
  readonly #widgets = inject(FzAssistantWidgetRegistryService);

  /**
   * Runs the steps in order and reports what landed.
   *
   * `view_context` is captured at each return, after the steps that preceded it, because it is the screen
   * the agent plans its next turn from. Taken at run entry it would contradict `value_applied` in the same
   * payload - the fill reported as applied, the field still reading the value it held before - and the
   * honest reading of that pair is that the write never landed. Fixtures A4 and A5 carry the applied value
   * on the completed and the halted path alike.
   */
  async act(steps: ActionStep[]): Promise<ExecutionResult> {
    // The flag is read here, at the one choke point every write goes through, and not only in
    // `FzAssistantActBinder`. `FzAssistantConfirmationController.approve()` starts the second run §5.8.4
    // asks for without passing through the binder at all, so the binder's check alone left a gated step -
    // a submit, by definition the commit that matters most - able to land after the feature had been
    // turned off: the halt waits in the controller for a human, and Optimizely refreshes its datafile
    // mid-session. Turning the flag off has to stop a write that has not happened yet, whatever started
    // it.
    if (!this.#isActEnabled()) {
      return this.#refuseDisabledRun(steps);
    }

    const results: StepResult[] = [];
    // Read before the first step runs, so the recapture can tell the arrived screen from the one it left.
    const entryHost = this.#hosts.getActiveHost();
    let hasRouteMoved = false;

    for (const [index, step] of steps.entries()) {
      // Measured per step rather than end to end. Comparing the final URL with the entry one calls a round
      // trip - `/a` to `/b` and back - a run that never moved, and so skips the settle for the one navigate
      // that most needs it: the arrived host is a *new* instance either way. Op-agnostic for the same
      // reason - `navigate` is not the only step that can change the route - and it says something a
      // navigate's own `status: 'ok'` does not, which is whether the app actually went anywhere.
      const routeBeforeStep = this.#router.url;

      // Widget and host code are owned by each feature, so a throw is a realistic outcome. Letting it
      // reject `act()` would cost the caller every step result, `halted_at` and the `view_context` at
      // once, which is the opposite of the fail-closed behaviour a halt exists to provide.
      const result = await this.#executeStepSafely(step, index);
      results.push(result);
      hasRouteMoved = hasRouteMoved || this.#router.url !== routeBeforeStep;

      if (result.status !== 'ok') {
        return {
          halted_at: index,
          status: 'halted',
          steps: results,
          view_context: await this.#captureViewContext(hasRouteMoved, entryHost),
        };
      }
    }

    return {
      status: 'completed',
      steps: results,
      view_context: await this.#captureViewContext(hasRouteMoved, entryHost),
    };
  }

  async #applyValue(step: FzAssistantFillActionStep, index: number): Promise<StepResult> {
    const resolution = this.#resolveTarget(step.ref);
    if (resolution.ok === false) {
      return this.#halt(step, index, resolution.error);
    }

    const { capable, writeTarget } = resolution.target;
    const { hasFailed, state } = this.#readCapableState(capable, step, index);

    // A contract that throws is, to the agent, a contract that is not there - so a fill against it reports
    // what capture already published for the same element as `capture_error`. §3.6 gives
    // `widget_not_capable` both statuses ("capture_error / halt") for that reason, and it is the §5.6.1
    // bridge-backlog signal; `rejected` said "Act refused this step" and filed a broken bridge with the
    // denylist refusals instead. Before the operability refusal, because a snapshot that could not be read
    // says nothing about operability either.
    if (hasFailed) {
      return this.#halt(step, index, 'widget_not_capable');
    }

    // Operability before anything else, and on both paths. Capture publishes `disabled` and `readonly`
    // from these same predicates, so a control it called inoperable must be refused rather than written -
    // and `rejected` says that, where a `fill_not_supported` halt would blame the write path instead.
    //
    // A secret field is refused here too, on both paths. Discover already omits its value, so a fill on
    // one is the agent acting on something it was never shown; the native adapter refuses them itself,
    // and doing it once here means a bridged secret leaf cannot be written through its contract either.
    if (isNativeControlBlockedForWrite(writeTarget) || isBlockedByState(state) || isFzAssistantSecretField(writeTarget)) {
      return this.#reject(step, index);
    }

    const value = this.#resolveApplyValue(step.value, writeTarget, capable !== undefined);
    if (value === undefined) {
      return this.#reject(step, index);
    }

    // Refusals come before the gate: gating first sends the agent to ask a human to approve a step that
    // could never have succeeded, and reports `confirmation_required` for what is really a refusal.
    const gate = this.#confirmationGate.evaluate(step, state);
    if (gate !== 'allowed') {
      return this.#halt(step, index, gate);
    }

    if (capable !== undefined) {
      const result = await capable.applyAssistantValue(value);
      return this.#toCapableStepResult(step, index, result);
    }

    if (!this.#nativeControlAdapter.supports(writeTarget)) {
      return this.#halt(step, index, this.#readUnsupportedFillError(writeTarget));
    }

    const writtenElement = await this.#nativeControlAdapter.applyValue(writeTarget, value);
    if (writtenElement === undefined) {
      return this.#halt(step, index, this.#readUnsupportedFillError(writeTarget));
    }

    // Read back rather than echo the request: the adapter can land something else - a radio group
    // selects a sibling, a select resolves an option, a number is normalised - and reading through the
    // reader capture uses keeps `value_applied` in the vocabulary the next `view_context` speaks.
    //
    // Off the element the adapter says it wrote, not the one the step addressed. The two differ only on a
    // radio fill carrying a sibling's value, and there the addressed radio is genuinely unchecked
    // afterwards: reporting its `null` on an `ok` step reads as a write that never landed, where the
    // agent is reasoning about the group it reached through that ref. The cost is that this one step
    // reports the group while the next `view_context` still publishes `null` for the ref itself.
    const appliedValue = readFzAssistantNativeValue(writtenElement);

    return {
      index,
      op: step.op,
      ref: step.ref,
      status: 'ok',
      ...(appliedValue !== undefined ? { value_applied: appliedValue } : {}),
    };
  }

  /** Dumb DOM click on the resolved ref — capable exposes no click hook (§5.4). */
  #click(step: FzAssistantClickActionStep, index: number): Promise<StepResult> {
    return this.#clickResolvedRef(step, index, step.ref);
  }

  /**
   * Resolve, refuse if not operable, gate, click - in that order, for both ops that end in a click, so
   * the two cannot drift.
   *
   * Operability comes before the gate on purpose. Gating first sends the agent to ask a human to approve
   * a step that could never have succeeded, and reports `confirmation_required` for what is really a
   * refusal.
   */
  async #clickResolvedRef(step: FzAssistantClickActionStep | FzAssistantSubmitActionStep, index: number, ref: string): Promise<StepResult> {
    const resolution = this.#resolveTarget(ref);
    if (resolution.ok === false) {
      return this.#halt(step, index, resolution.error);
    }

    const { capable, element } = resolution.target;
    // A failed read is not distinguished here, unlike on the write path: `widget_not_capable` is about
    // there being no way to *write* the value, and a click asks the widget for nothing. The fail-closed
    // state refuses the click, which is the answer either way.
    const { state } = this.#readCapableState(capable, step, index);

    // `isReadonly` is deliberately not read here, matching the DOM predicates: readonly blocks
    // editing, not activation.
    //
    // The host's verdict joins them on a submit, and only on a submit: `submitEnabled` reaches the
    // agent as `form_valid`, so committing through the screen's own button while the host publishes
    // `false` commits a form the agent was told was invalid - and refuses on the host path what it
    // allows here, for the same intent. It sits after the resolve rather than before it so a stale ref
    // still reports `target_stale`: the agent cannot fix a ref it is never told about.
    if (isFzAssistantElementUnavailable(element) || state.isDisabled === true || this.#isBlockedByHostValidity(step, index)) {
      return this.#reject(step, index);
    }

    // The element goes to the gate as well as the state: a `click` on a control that submits a form is
    // the same commit `op: 'submit'` would make on it, and the gate cannot see that from the op alone.
    const gate = this.#confirmationGate.evaluate(step, state, element);
    if (gate !== 'allowed') {
      return this.#halt(step, index, gate);
    }

    return this.#toClickStepResult(step, index, await this.#nativeControlAdapter.click(element));
  }

  async #executeStepSafely(step: ActionStep, index: number): Promise<StepResult> {
    try {
      return await this.#executeStep(step, index);
    } catch (error: unknown) {
      this.#reportStepThrow(step, index, error);
      // `rejected`, not `fill_not_supported`: this catch is generic over every op, so a throwing host
      // callback has nothing to do with fill support. The write path reports `fill_not_supported` itself,
      // where it knows the step was a fill.
      //
      // This catch is what keeps a throw from costing the run, so the narrower ones around
      // `getAssistantSnapshot` and `submitEnabled` are not there to prevent that - they only change
      // which code the agent sees for a step that was going to end non-`ok` either way. Adding a third
      // layer buys nothing.
      //
      return this.#reject(step, index);
    }
  }

  /**
   * A throw from feature-owned code, made visible without leaving the frozen taxonomy.
   *
   * §3.6 is closed, so there is no code to mint for "this widget has a bug" - `rejected` stays the
   * honest answer on the wire, because Act refused and nothing landed. What was missing is that the
   * throw reached nobody at all: swallowing it turned a widget bug into an ordinary halt that the agent
   * replans around and no engineer ever sees.
   *
   * Error level, per §10.2's "prod: error-level typed failures", dimensioned as §10.1 asks - route, op,
   * ref, step index. The step's `value` is deliberately absent: §10.1 rules out logging field values,
   * which are partner content and may carry PII.
   *
   * `captureException`, not `captureMessage`. The throw is the only thing that says *which* widget line
   * broke, and a message event carries no stack at all - so the report named the step and told an engineer
   * nothing they could act on, which is the gap this method exists to close. It also groups by the
   * widget's own stack rather than by prose, where a message interpolating the step index fingerprinted
   * one widget bug into a fresh Sentry issue per position in the plan. Whatever the widget wrote into its
   * own error message travels with it - the exposure every `captureException` in this app already carries,
   * `app.module.ts` included; we add no field value of our own.
   *
   * TODO(INT-C.4): this is a report, not telemetry. The halt-code and native-fallback dashboards
   * (§5.6.1 / §10.1) belong to that ticket; when they land, emit there **as well as** here, not instead
   * - a dashboard counts these, it does not carry the stack that explains one.
   */
  #reportStepThrow(step: ActionStep, index: number, error: unknown): void {
    const context = {
      index,
      op: step.op,
      ref: readActionStepRef(step) ?? null,
      route: this.#router.url,
    };
    const message = `[FzAssistantAct] Step ${index} (${step.op}) threw; the step is reported to the agent as non-ok`;

    console.error(message, context, error);
    Sentry.captureException(error, { extra: { ...context, message }, level: 'error' });
  }

  #executeStep(step: ActionStep, index: number): Promise<StepResult> {
    switch (step.op) {
      case 'fill':
      case 'select':
      case 'select_many':
        return this.#applyValue(step, index);
      case 'click':
        return this.#click(step, index);
      case 'navigate':
        return this.#navigate(step, index);
      case 'submit':
        return this.#submit(step, index);
      case 'trigger':
        return this.#trigger(step, index);
      default: {
        // Steps arrive as agent JSON and nothing validates `op` at the boundary yet (PRD-4606 owns the
        // binder), so an unknown op has to be refused rather than fall off the end of the switch. The
        // `never` assignment keeps the union exhaustive: adding an op breaks the build here.
        const unsupportedStep: never = step;
        return Promise.resolve(this.#reject(unsupportedStep, index));
      }
    }
  }

  /**
   * A typed stop the agent replans against, carrying the screen as it stands in the same result.
   *
   * One reading is worth stating, because §3.6 glosses it by ref alone: `target_not_found` covers every
   * target a step can address, not only a `ref`. An unmatched `route`, a host that exposes no `submit`,
   * and an unknown `action_id` all report it - §3.5 lets a step name its target three ways, and the
   * frozen set has exactly one code for "the thing you addressed is not there".
   */
  #halt(step: ActionStep, index: number, error: FzAssistantActErrorCode): StepResult {
    return {
      error,
      index,
      op: step.op,
      ...this.#refField(step),
      status: 'halt',
    };
  }

  /**
   * Read per run, never cached, because the flag can flip between two runs of the same session.
   *
   * `null` - the Optimizely SDK still initialising, with no `?ofeat=` override - is off: this is the write
   * path, and an unproven "maybe" must not mutate a Partner's screen. The same reading as
   * `FzAssistantActBinder#isActEnabled`, duplicated rather than shared: two independent refusals of one
   * flag is the point, and the binder's exists to answer the agent where this one exists to answer every
   * caller.
   */
  #isActEnabled(): boolean {
    return this.#optimizely.isFeatureEnabled(FeatureFlags.ENABLE_FZ_ASSISTANT_DI_ACT) === true;
  }

  async #navigate(step: FzAssistantNavigateActionStep, index: number): Promise<StepResult> {
    // Angular defaults `onSameUrlNavigation` to `ignore` and this app never overrides it, so asking for
    // the route we are already on is skipped and resolves `false` - indistinguishable from a cancelled
    // navigation. The desired end state already holds, so refusing it would send the agent round a loop
    // to reach a screen it is looking at.
    if (this.#router.url === step.route) {
      return this.#ok(step, index);
    }

    try {
      const isNavigated = await this.#router.navigateByUrl(step.route);
      // A guard or redirect cancelled the navigation: the app refused, so the agent must not
      // assume the target screen is loaded.
      return isNavigated ? this.#ok(step, index) : this.#reject(step, index);
    } catch {
      // Unmatched route or a failing resolver — the planned route itself is wrong.
      return this.#halt(step, index, 'target_not_found');
    }
  }

  #ok(step: ActionStep, index: number): StepResult {
    return {
      index,
      op: step.op,
      ...this.#refField(step),
      status: 'ok',
    };
  }

  #refField(step: ActionStep): { ref?: string } {
    const ref = readActionStepRef(step);

    return ref === undefined ? {} : { ref };
  }

  /**
   * The run Act refuses because the tool is off: nothing applied, in the shape §3.5 has for it.
   *
   * `rejected` on the first step, and the halt there, because §3.6 is frozen and §5.12 already reads
   * `rejected` as "Act refused this step, nothing was written, and running it again will not change
   * that" - which is exactly true here, and is the same code the irreversible-op denylist will report.
   * Minting a `feature_disabled` code would break the vocabulary the backend contract is being agreed
   * against for no gain to a caller that cannot act on the difference.
   *
   * `halted` and not `completed` even with no steps to refuse: `completed` is what an *enabled* `act([])`
   * returns, and an agent reading it would take the tool for working. `view_context` is captured either
   * way, because a caller owed an `ExecutionResult` is owed the screen with it.
   */
  async #refuseDisabledRun(steps: ActionStep[]): Promise<ExecutionResult> {
    const [firstStep] = steps;
    const viewContext = await this.#captureViewContext(false, this.#hosts.getActiveHost());

    return firstStep === undefined
      ? { status: 'halted', steps: [], view_context: viewContext }
      : { halted_at: 0, status: 'halted', steps: [this.#reject(firstStep, 0)], view_context: viewContext };
  }

  /**
   * Act refuses the step outright (no mutation) - the agent stops instead of replanning a retry.
   *
   * Broader than §3.6's one-line gloss ("human declined confirmation"), and deliberately so: §5.12 reads
   * `rejected` as "no gated mutation (or denylist refusal)", and the frozen set offers nothing else for
   * a step Act declined to run. It carries an inoperable target, a value with no applicable translation,
   * a cancelled navigation, a host callback that threw, an op Act does not implement, and the generic
   * catch. What all of them share is the only part the agent acts on: nothing was written, and running
   * the same step again will not change that.
   */
  #reject(step: ActionStep, index: number): StepResult {
    return {
      error: 'rejected',
      index,
      op: step.op,
      ...this.#refField(step),
      status: 'rejected',
    };
  }

  /**
   * The screen as it stands now, or the baseline when capture cannot describe it.
   *
   * Capture reads every registered contract's `getAssistantSnapshot`, and nothing between here and there
   * catches a throw - the same feature-owned code `#executeStepSafely` already fails soft around. At run
   * entry a throw cost nothing, because no step had run yet. Here it would reject `act()` after the writes
   * had landed and take every step result and `halted_at` down with it, which is the one thing a runner
   * built to halt must never do.
   *
   * `buildViewContextForSend` rather than `buildViewContext`, because after a `navigate` the old host has
   * deregistered and the new one registers in its `ngOnInit`, on the routed view's first change detection
   * - which `navigateByUrl` does not wait for. Reading through the plain builder in that window publishes
   * `elements: []`, and §3.4 reads that as "captured, and this screen has no interactives" rather than
   * "no capture ran". A confidently empty screen is worse than a missing one: the agent replans against a
   * page it believes has no controls. The omission is the honest answer until the host is up.
   *
   * The fallback is now the exception rather than the norm: `#settleForRecapture` waits for the arrived
   * screen first, so a post-navigate run describes the page it landed on. Omission is what is left when
   * that wait runs out, or when the route genuinely mounts no host.
   */
  async #captureViewContext(hasRouteMoved: boolean, entryHost: FzAssistantRegisteredHost | null): Promise<FzAssistantViewContext> {
    if (hasRouteMoved) {
      await this.#settleForRecapture(entryHost);
    }

    try {
      return this.#discover.buildViewContextForSend();
    } catch {
      return this.#discover.buildBaselineViewContext();
    }
  }

  /**
   * Waits for the arrived screen to exist before reading it, or gives up.
   *
   * `afterNextRender`, not `ApplicationRef.whenStable()`. Stability is zone-wide, and the assistant's own
   * chat poll keeps a request in flight for as long as the dock is open, so a `whenStable()` here would
   * resolve late or never - and §5.10 rules out a global HTTP-quiescence wait for that same reason. A
   * render is the narrower event actually being waited on: the routed view's first change detection, which
   * is where `[fzAssistantHost]` registers in `ngOnInit` and which `navigateByUrl` does not await.
   *
   * What is waited for is the arrived host being **registered**: present, and not the one the run started
   * on. Both halves are load-bearing. Identity alone is not enough, because the outgoing host unregisters
   * in its own `ngOnDestroy` while the arrived one registers on a later change detection, so there is a
   * window where the registry is *empty* - and "not the entry host" is true of `null`, which ended the
   * wait immediately and published the `{ route, title }` baseline for a screen that was about to exist.
   * Presence alone is not enough either, because before that window the departed host is still
   * registered, and describing the screen the run just left is a worse answer than describing neither.
   *
   * Navigating to a view that mounts no host is legitimate and spends the whole budget before falling
   * through to the baseline. That is the reason the budget is small.
   */
  async #settleForRecapture(entryHost: FzAssistantRegisteredHost | null): Promise<void> {
    for (let attempt = 0; attempt < this.#settleConfig.maxRenderWaits; attempt += 1) {
      const activeHost = this.#hosts.getActiveHost();
      if (activeHost !== null && activeHost !== entryHost) {
        return;
      }

      await this.#waitForNextRender();
    }
  }

  /** One render or the deadline, whichever lands first - and the loser is torn down either way. */
  #waitForNextRender(): Promise<void> {
    return new Promise<void>(resolve => {
      let renderRef: AfterRenderRef | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const settle = (): void => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        renderRef?.destroy();
        resolve();
      };

      timeoutId = setTimeout(settle, this.#settleConfig.renderTimeoutMs);
      // `manualCleanup` because the injector here is the root one: without it, every hook whose timeout
      // won would stay registered for the life of the app, one per navigate.
      renderRef = afterNextRender(settle, { injector: this.#injector, manualCleanup: true });
    });
  }

  /**
   * The value to hand a write path, or `undefined` when there is none to hand it.
   *
   * `null` is the agent echoing back what capture published for an empty control - an unchecked radio, an
   * empty numeric field - so it is translated into that control's own empty value rather than refused.
   * Two cases have no translation: a capable contract, whose `AssistantApplyValue` excludes `null` and
   * whose idea of empty is its own to define, and a control with no empty state to reach at all.
   */
  #resolveApplyValue(value: FzAssistantWireValue, element: Element, hasCapableContract: boolean): AssistantApplyValue | undefined {
    if (value !== null) {
      return value;
    }

    return hasCapableContract ? undefined : readFzAssistantNativeClearValue(element);
  }

  #resolveTarget(ref: string): FzAssistantActTargetResolution {
    const resolution = this.#refs.resolve(ref);
    if (resolution.status !== 'found') {
      return { error: resolution.status === 'stale' ? 'target_stale' : 'target_not_found', ok: false };
    }

    const { element } = resolution.entry;
    const capableHost = findNearestCapable(element, candidate => this.#widgets.get(candidate));

    return {
      ok: true,
      target: {
        element,
        writeTarget: capableHost?.element ?? element,
        ...(capableHost !== undefined ? { capable: capableHost.capable } : {}),
      },
    };
  }

  /** A `submit` the active host reports as invalid. Every other op is the host's business, not Act's. */
  #isBlockedByHostValidity(step: FzAssistantClickActionStep | FzAssistantSubmitActionStep, index: number): boolean {
    return step.op === 'submit' && !this.#isHostSubmitEnabled(this.#hosts.getActiveHost(), step, index);
  }

  /**
   * Host code, read defensively for the same reason `#runHostCallback` exists: a throw from this
   * predicate would otherwise escape and reject the whole run. A host that cannot say whether it may
   * submit has not said yes.
   */
  #isHostSubmitEnabled(host: FzAssistantRegisteredHost | null, step: ActionStep, index: number): boolean {
    try {
      return host?.config.submitEnabled?.() !== false;
    } catch (error: unknown) {
      // Reported for the same reason `#readCapableState` reports: this catch sits inside the generic one,
      // so `#executeStepSafely` never sees the throw, and the fail-closed `false` below turns a host bug
      // into an ordinary `rejected` that no engineer ever hears about.
      this.#reportStepThrow(step, index, error);

      return false;
    }
  }

  /**
   * The widget's own state, or the state that refuses the step when it cannot be read.
   *
   * Widget code, so a throw is a realistic outcome, and this is the only place it is read: the gate is a
   * pure function of the state handed to it. A snapshot that cannot be read has not said the target is
   * operable, so it fails closed - one refused step, where the throw would cost the whole run.
   *
   * `hasFailed` travels beside the state rather than being inferred from it, because a widget may
   * legitimately report every one of those flags itself, and the two cases are not the same thing.
   */
  #readCapableState(capable: FzAssistantCapable | undefined, step: ActionStep, index: number): FzAssistantCapableStateRead {
    if (capable === undefined) {
      return { hasFailed: false, state: {} };
    }

    try {
      return { hasFailed: false, state: capable.getAssistantSnapshot() };
    } catch (error: unknown) {
      // Reported for the same reason `#executeStepSafely` reports: this is feature-owned widget code, and
      // the fail-closed return below is exactly the swallow that turns a widget bug into an ordinary halt
      // nobody sees. The generic catch never gets the chance here, so the report has to happen at the
      // throw - a fill leaves as `widget_not_capable` and a click as an ordinary `rejected`, and neither
      // code says a snapshot blew up.
      this.#reportStepThrow(step, index, error);

      // Every flag set, so the state fails closed whichever reader looks at it next: refused as
      // inoperable, and gated rather than allowed if the order of the readers ever changes.
      return { hasFailed: true, state: { isConfirmationRequired: true, isDisabled: true, isReadonly: true } };
    }
  }

  /**
   * Which of the two write-path halts §5.6 asks for.
   *
   * `widget_not_capable` when the catalog says this tag should carry a contract and none is registered -
   * a missing bridge, and the §5.6.1 backlog signal - against `fill_not_supported` for a leaf nothing
   * was ever going to write. Capture publishes the same distinction as `capture_error` off the same
   * reader, so the agent is told one story about the element on both tools.
   */
  #readUnsupportedFillError(writeTarget: Element): Extract<FzAssistantActErrorCode, 'fill_not_supported' | 'widget_not_capable'> {
    return isFzAssistantKnownCapableTag(writeTarget, this.#captureConfig.capableTagSelectors) ? 'widget_not_capable' : 'fill_not_supported';
  }

  async #runHostCallback(step: ActionStep, index: number, run: () => void | Promise<void>): Promise<StepResult> {
    try {
      await run();
      return this.#ok(step, index);
    } catch (error: unknown) {
      // Reported before the reject: this catch is inside the generic one, so the throw would otherwise
      // reach nobody - the host's own submit or action code broke, and `rejected` alone does not say so.
      this.#reportStepThrow(step, index, error);

      // The host callback threw, so the intent did not land. Reporting `ok` here would tell the
      // agent a commit happened that never did (§5.12: missing/failed writes must be loud).
      return this.#reject(step, index);
    }
  }

  #submit(step: FzAssistantSubmitActionStep, index: number): Promise<StepResult> {
    return step.ref === undefined ? this.#submitViaHost(step, index) : this.#submitViaControl(step, index, step.ref);
  }

  /**
   * `submit` with a `ref`: commit through the screen's own submit control.
   *
   * Act does not read form validity here - a submit control on an invalid form is still clicked, and the
   * form's own validation refuses it. Pathway B covers the host's view of that through `submitEnabled`,
   * and every submit is gated, so a human sees it before anything commits.
   */
  #submitViaControl(step: FzAssistantSubmitActionStep, index: number, ref: string): Promise<StepResult> {
    return this.#clickResolvedRef(step, index, ref);
  }

  /** `submit` without a `ref`: Pathway B host facade owns the commit (§5.0). */
  async #submitViaHost(step: FzAssistantSubmitActionStep, index: number): Promise<StepResult> {
    const host = this.#hosts.getActiveHost();
    const submit = host?.config.submit;
    if (submit === undefined) {
      return this.#halt(step, index, 'target_not_found');
    }

    // Discover advertises this action as `enabled: false` / `form_invalid`; committing anyway would
    // fight the host's own validation.
    if (!this.#isHostSubmitEnabled(host, step, index)) {
      return this.#reject(step, index);
    }

    const gate = this.#confirmationGate.evaluate(step);
    if (gate !== 'allowed') {
      return this.#halt(step, index, gate);
    }

    return this.#runHostCallback(step, index, () => submit());
  }

  #toCapableStepResult(step: FzAssistantFillActionStep, index: number, result: AssistantFillResult): StepResult {
    // A contract may halt without saying why, and a halt with no code leaves the agent nothing to
    // replan against - which is what the frozen §3.6 codes exist to prevent. Fall back to the one
    // that is true whenever a contract declined to apply the value.
    //
    // An `ok` carries no code at all. `AssistantFillResult` lets a contract set both, and forwarding
    // that pair would put a step on the wire the agent has no rule for: it succeeded, and here is why
    // it failed.
    //
    // `no_match` and `ambiguous_match` reach the wire only through this method. Act never mints them:
    // §5.9 puts the optimistic remote select inside `applyAssistantValue`, so the contract is the only
    // code that knows whether a search returned nothing or too much. Forwarding them unflattened is what
    // keeps that half of §3.6 reachable at all.
    const error = result.status === 'ok' ? undefined : (result.error ?? 'fill_not_supported');

    return {
      index,
      op: step.op,
      ref: step.ref,
      status: result.status,
      ...(error !== undefined ? { error } : {}),
      ...(result.value_applied !== undefined ? { value_applied: result.value_applied } : {}),
    };
  }

  /**
   * A click the browser never dispatched (disabled / `aria-disabled` / non-element) is a refusal,
   * not a successful step: Discover already reports the control as disabled, so the plan is stale.
   */
  #toClickStepResult(step: ActionStep, index: number, isClicked: boolean): StepResult {
    return isClicked ? this.#ok(step, index) : this.#reject(step, index);
  }

  async #trigger(step: FzAssistantTriggerActionStep, index: number): Promise<StepResult> {
    const action = readHostAction(this.#hosts.getActiveHost(), step.action_id);
    if (action === undefined) {
      return this.#halt(step, index, 'target_not_found');
    }

    const gate = this.#confirmationGate.evaluate(step);
    if (gate !== 'allowed') {
      return this.#halt(step, index, gate);
    }

    return this.#runHostCallback(step, index, () => action(step.args));
  }
}

/**
 * `action_id` comes from the agent, so only the host's **own** enumerable action keys may resolve:
 * a plain map lookup would hand back inherited `Object.prototype` members as callables.
 */
function readHostAction(host: FzAssistantRegisteredHost | null, actionId: string): FzAssistantHostCallback | undefined {
  const actions = host?.config.actions;
  if (actions === undefined || !Object.prototype.hasOwnProperty.call(actions, actionId)) {
    return undefined;
  }

  // `unknown`, not the record's value type: `actionId` comes from the agent, so the key may be absent at
  // runtime however the host typed its map.
  const action: unknown = actions[actionId];
  if (typeof action !== 'function') {
    return undefined;
  }

  return action as FzAssistantHostCallback; // the signature is the `actions` value type the host declared; `typeof` proves only `Function`
}
