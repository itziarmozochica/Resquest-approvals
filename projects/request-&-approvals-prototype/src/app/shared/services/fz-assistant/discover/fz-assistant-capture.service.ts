import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';

import { AssistantWidgetSnapshot, FzAssistantCapable } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { FzAssistantCapturedElement } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-captured.model';
import {
  FZ_ASSISTANT_DEFAULT_CAPTURE_CONFIG,
  FzAssistantCaptureConfig,
  FzAssistantCaptureService as FzAssistantCaptureServiceContract,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';
import { FzAssistantWireValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import { FzAssistantA11yReader } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-a11y-reader';
import { findNearestCapable, FzAssistantCandidateMatcher } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-candidate-matcher';
import { FzAssistantCaptureGate } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-capture-gate';
import { matchesAssistantChrome, omitAssistantChrome } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-denylist.util';
import { mapFzAssistantCapturedElement } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-element-mapper.util';
import { redactFzAssistantSecretValue } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-secret-redaction.util';
import { FzAssistantTableSummarizer } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-table-summarizer';

import { FzAssistantHostRegistryService } from '../host/fz-assistant-host-registry.service';
import { FzAssistantWidgetRegistryService } from '../widget/fz-assistant-widget-registry.service';
import { FzAssistantRefRegistryService } from './fz-assistant-ref-registry.service';

export const FZ_ASSISTANT_CAPTURE_CONFIG = new InjectionToken<FzAssistantCaptureConfig>('FZ_ASSISTANT_CAPTURE_CONFIG', {
  factory: () => FZ_ASSISTANT_DEFAULT_CAPTURE_CONFIG,
  providedIn: 'root',
});

@Injectable({
  providedIn: 'root',
})
export class FzAssistantCaptureService implements FzAssistantCaptureServiceContract {
  readonly #a11yReader = new FzAssistantA11yReader();
  readonly #config = inject(FZ_ASSISTANT_CAPTURE_CONFIG);
  readonly #document = inject(DOCUMENT);
  readonly #gate = FzAssistantCaptureGate.create(this.#config.denylistSelectors);
  readonly #hostRegistry = inject(FzAssistantHostRegistryService);
  readonly #refRegistry = inject(FzAssistantRefRegistryService);
  readonly #tableSummarizer = new FzAssistantTableSummarizer({
    hostSelectors: this.#config.tableHostSelectors,
    nonDataRowClassNames: this.#config.tableNonDataRowClassNames,
    interactiveRowClassNames: this.#config.tableInteractiveRowClassNames,
  });
  readonly #widgetRegistry = inject(FzAssistantWidgetRegistryService);
  readonly #candidateMatcher = new FzAssistantCandidateMatcher({
    config: this.#config,
    isRegisteredCapable: element => this.#widgetRegistry.get(element) !== undefined,
    tableSummarizer: this.#tableSummarizer,
  });

  capture(roots: ParentNode[]): FzAssistantCapturedElement[] {
    const candidates = this.#collectCandidates(roots);
    return candidates.map(candidate => this.#enrichCandidate(candidate));
  }

  filterDenylisted(candidates: readonly Element[]): Element[] {
    return omitAssistantChrome(candidates, this.#config.denylistSelectors);
  }

  isDenylisted(element: Element): boolean {
    return matchesAssistantChrome(element, this.#config.denylistSelectors);
  }

  redactSecretValue(element: Element, value: FzAssistantWireValue | undefined): FzAssistantWireValue | undefined {
    return redactFzAssistantSecretValue(element, value);
  }

  resolveRoots(hostElement: Element | null = this.#hostRegistry.getActiveHost()?.element ?? null): ParentNode[] {
    const roots: ParentNode[] = [];
    const seen = new Set<ParentNode>();

    if (hostElement !== null && hostElement.isConnected) {
      roots.push(hostElement);
      seen.add(hostElement);
    }

    for (const selector of this.#config.overlayRootSelectors) {
      if (selector.trim() === '') {
        continue;
      }

      const overlays = this.#document.querySelectorAll(selector);
      for (let index = 0; index < overlays.length; index++) {
        const overlay = overlays.item(index);
        if (overlay === null || !overlay.isConnected || seen.has(overlay)) {
          continue;
        }

        roots.push(overlay);
        seen.add(overlay);
      }
    }

    return roots;
  }

  #collectCandidates(roots: ParentNode[]): Element[] {
    const candidates: Element[] = [];
    const seen = new Set<Element>();

    for (const root of roots) {
      this.#walk(root, candidates, seen);
      if (candidates.length >= this.#config.elementCap) {
        break;
      }
    }

    return candidates;
  }

  #walk(node: ParentNode, candidates: Element[], seen: Set<Element>): void {
    if (candidates.length >= this.#config.elementCap) {
      return;
    }

    if (node instanceof Element) {
      if (this.#gate.excludes(node)) {
        return;
      }

      const match = this.#candidateMatcher.match(node);
      if (match !== undefined) {
        this.#pushCandidate(node, candidates, seen);
        if (!match.descend) {
          return;
        }
      }
    }

    if (!(node instanceof Element || node instanceof DocumentFragment || node instanceof Document)) {
      return;
    }

    const children = node.children;
    for (let index = 0; index < children.length; index++) {
      const child = children.item(index);
      if (child === null) {
        continue;
      }

      this.#walk(child, candidates, seen);
      if (candidates.length >= this.#config.elementCap) {
        return;
      }
    }
  }

  #pushCandidate(element: Element, candidates: Element[], seen: Set<Element>): void {
    if (seen.has(element) || candidates.length >= this.#config.elementCap) {
      return;
    }

    seen.add(element);
    candidates.push(element);
  }

  #enrichCandidate(element: Element): FzAssistantCapturedElement {
    if (this.#tableSummarizer.matches(element)) {
      return mapFzAssistantCapturedElement({
        a11y: this.#a11yReader.read(element),
        element,
        ref: this.#refRegistry.stamp(element),
        tableSummary: this.#tableSummarizer.summarize(element),
      });
    }

    const capableHost = findNearestCapable(element, host => this.#widgetRegistry.get(host));
    const snapshotRead = readAssistantSnapshotSafely(capableHost?.capable);
    const knownCapableWithoutContract =
      this.#candidateMatcher.match(element)?.kind === 'capable' && this.#widgetRegistry.get(element) === undefined;

    // A contract that throws is, to the agent, a contract that is not there - so it reports the code a
    // capable tag with no registration at all reports. The alternative is worse than imprecise: nothing
    // between `getAssistantSnapshot` and `capture()` catches, so one bad widget took down the whole
    // `view_context`, and Act's end-of-run recapture then fell back to the baseline for every element on
    // the screen rather than losing the one it could not read (§4.9).
    const captured = mapFzAssistantCapturedElement({
      a11y: this.#a11yReader.read(element, { snapshotDisplayName: snapshotRead.snapshot?.label }),
      captureError: knownCapableWithoutContract || snapshotRead.hasFailed ? 'widget_not_capable' : undefined,
      element,
      ref: this.#refRegistry.stamp(capableHost?.element ?? element),
      snapshot: snapshotRead.snapshot,
    });

    if (captured.value !== undefined) {
      captured.value = this.redactSecretValue(element, captured.value);
    }

    return captured;
  }
}

interface FzAssistantSnapshotRead {
  snapshot?: AssistantWidgetSnapshot;
  hasFailed: boolean;
}

/**
 * The widget's snapshot, or the fact that it could not be read.
 *
 * Widget code is owned by each feature, so a throw is a realistic outcome — a getter on a
 * half-destroyed component is the usual shape. Read defensively here because this is the only place
 * capture calls into feature code, and an escape costs every other element on the screen.
 */
function readAssistantSnapshotSafely(capable: FzAssistantCapable | undefined): FzAssistantSnapshotRead {
  if (capable === undefined) {
    return { hasFailed: false };
  }

  try {
    return { hasFailed: false, snapshot: capable.getAssistantSnapshot() };
  } catch {
    return { hasFailed: true };
  }
}
