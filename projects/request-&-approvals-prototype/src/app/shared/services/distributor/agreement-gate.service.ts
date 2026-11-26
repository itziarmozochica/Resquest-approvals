import { computed, effect, inject, Injectable, signal, Signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { B2bIamAuthClient, type AgreementPermission, type BaseResponse, type DistributorPartnerConfig } from '@fz/b2b-iam';
import { STORAGE_SERVICE } from '@fz/storage';
import { catchError, defer, EMPTY, map, mergeMap, Observable, of, shareReplay, Subject, switchMap, take, tap, timeout } from 'rxjs';

import { PartnerService } from '../partner/partner.service';
import { AgreementGateStatus } from './agreement-gate-status.enum';
import { AGREEMENT_RESERVE_PERMISSION } from './agreement-permissions';
import { BusinessAsOrganizationFlagService } from './business-as-organization-flag.service';
import { DistributorPartnersService } from './distributor-partners.service';
import { DistributorSessionState } from './distributor-session-state.enum';
import { DistributorSessionStore } from './distributor-session.store';
import { readRememberedPartner } from './remembered-partner.util';
import { resolveSelectedPartner } from './resolve-selected-partner.util';

/**
 * How long anything may wait on this gate before the wait itself becomes the refusal.
 *
 * Nothing else bounds the request: `getAgreementPermissions` has no timeout and `TimeoutInterceptor`
 * only bounds requests that opt in with a `timeout` header, which this one cannot set. Unbounded, a
 * hung request leaves the navigation pending for ever, without even a spinner — `AppComponent` only
 * shows one for navigation id 1 — so *Make a reservation* becomes a silent dead click.
 *
 * 8s because the budget covers a **cold** load's three sequential round trips (`getMe()`,
 * `getDistributor()`, then the agreement check); anything shorter refuses a legitimately allowed
 * distributor on a slow connection. Expiry resolves to {@link AgreementGateStatus.Unavailable}, which
 * every consumer refuses (§4.7) — recoverable, since it lands on the reservations list where the CTA
 * re-checks and explains itself.
 */
const AGREEMENT_GATE_TIMEOUT_MS = 8_000;

interface AgreementPair {
  readonly distributorOrganizationId: number;
  readonly sessionGeneration: number;
  readonly targetOrganizationId: number;
}

type AgreementVerdict = AgreementGateStatus.Allowed | AgreementGateStatus.NotAllowed | AgreementGateStatus.Unavailable;

/**
 * A verdict **stamped with the pair it answers for** (AC13, AC20). Every read recomputes the pair it
 * wants and compares, so a previous partner's answer is unreadable from the instant the question
 * changes — staleness is a property of the comparison, not of when a request is cancelled.
 */
interface AgreementAnswer {
  readonly pair: AgreementPair;
  /**
   * The concession's resolved set, or `null` when there is no answer — a failed request, a thrown
   * error, an expired wait, or an envelope carrying `data: null`. Kept apart from an empty set, which
   * *is* an answer (the concession grants nothing) and reads as `NotAllowed` rather than `Unavailable`.
   *
   * The single source of truth for an answer: {@link verdictOf} derives the reserve verdict from it
   * rather than storing one alongside, so the verdict and the set it describes cannot drift apart.
   */
  readonly permissions: ReadonlySet<AgreementPermission> | null;
}

/**
 * What the gate has to answer about a given partner — or why it cannot.
 *
 * A union rather than `AgreementPair | null` because a bare `null` collapsed *no partner is chosen*
 * (open, nothing is being authorized), *we could not ask* (refuse, §4.7) and *we do not know yet*
 * (wait) — and the gate opened for all three.
 */
type AgreementQuestion =
  | { readonly kind: 'ask'; readonly pair: AgreementPair }
  | { readonly kind: 'noPartner' }
  | { readonly kind: 'notApplicable' }
  | { readonly kind: 'sessionUnresolved' }
  | { readonly kind: 'unanswerable' }
  | { readonly kind: 'unusableParam' };

export interface AgreementGateDecision {
  /** The partner the verdict judges, or `null` when none was in play. */
  readonly partnerOrganizationId: number | null;
  /** Never {@link AgreementGateStatus.Checking}. */
  readonly status: AgreementGateStatus;
}

/**
 * Answers *may this distributor reserve for a given partner?* (B2BR-5591 · WI-15).
 *
 * A **read model**, not a screen and not a guard: the reservations-list button and the create-route
 * guard both consult it and neither owns it. Root-provided because it must outlive any one route
 * activation — a guard runs before a component exists, and both must see one answer.
 *
 * ## The contract
 *
 * | Member | Keyed on | For |
 * | --- | --- | --- |
 * | {@link status} | the session's chosen partner | rendering — all five states, synchronous |
 * | {@link canReserveForSelectedPartner} | the session's chosen partner | deciding — `true` only for `Allowed` |
 * | {@link settleFor} | **the partner a URL names** | a guard, which runs before the store is written |
 *
 * ## Why {@link settleFor} takes the URL's partner
 *
 * Angular runs every `canActivate` **before** any `resolve`, so at guard time the session store either
 * holds nothing (a typed URL, a bookmark) or holds the *previous* screen's partner. Answering a guard
 * from the store therefore judges the wrong partner — or none — precisely on the navigations this gate
 * exists to police; an earlier revision of this branch was a provable authorization bypass for exactly
 * that reason. Taking the partner from the URL removes the ordering problem instead of racing it, and
 * means no guard has to write global state to be answered correctly.
 *
 * ## Fail closed (§4.7)
 *
 * A failed request, an empty envelope, a thrown error, an expired wait and an unanswerable check (no
 * distributor organization to ask about) all resolve to `Unavailable`, which refuses — never to
 * `NotAsked`, which opens.
 */
@Injectable({ providedIn: 'root' })
export class AgreementGateService {
  readonly #client = inject(B2bIamAuthClient);
  readonly #businessAsOrganizationFlag = inject(BusinessAsOrganizationFlagService);
  readonly #partnerService = inject(PartnerService);
  readonly #partnersService = inject(DistributorPartnersService);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #store = inject(DistributorSessionStore);

  readonly #answers = signal<ReadonlyMap<string, AgreementAnswer>>(new Map());

  readonly #inFlight = new Map<string, Observable<AgreementAnswer>>();

  /**
   * The question the *session's* selection poses, for the rendering members below.
   *
   * `equal` stops a re-emit — and so a duplicate request — when the resolver re-runs on an unrelated
   * query-param change (`runGuardsAndResolvers: 'paramsOrQueryParamsChange'`) and sets an equivalent
   * config. AC4 pins "no extra request".
   */
  readonly #question: Signal<AgreementQuestion> = computed(() => this.#questionFor(this.#store.selectedPartnerConfig()), {
    equal: sameQuestion,
  });

  /**
   * The gate's answer for the partner currently chosen. Synchronous, safe to read from a template.
   *
   * Derived rather than stored so it cannot lag the selection: the question is recomputed on every read
   * and an answer for any other pair reads as {@link AgreementGateStatus.Checking}.
   */
  readonly status: Signal<AgreementGateStatus> = computed(() => {
    const question = this.#question();
    switch (question.kind) {
      case 'ask': {
        const answer = this.#answers().get(pairKey(question.pair));
        return answer === undefined ? AgreementGateStatus.Checking : verdictOf(answer);
      }
      case 'noPartner':
      case 'notApplicable':
        return AgreementGateStatus.NotAsked;
      case 'sessionUnresolved':
        return AgreementGateStatus.Checking;
      case 'unanswerable':
      case 'unusableParam':
        return AgreementGateStatus.Unavailable;
    }
  });

  /**
   * **Gate on this, not on `status() !== NotAllowed`.** Every non-permissive state, including a failed
   * check and an unfinished one, is a refusal here, so a consumer cannot fail open by forgetting a case
   * (§4.7, R5).
   */
  readonly canReserveForSelectedPartner: Signal<boolean> = computed(() => this.status() === AgreementGateStatus.Allowed);

  /**
   * Pushes each distinct question so the rendering members have an answer without anyone asking.
   *
   * A plain `Subject`, deliberately: `toObservable` is a `ReplaySubject(1)` fed by an effect, so it
   * hands a subscriber whatever was true at the **last effect flush** rather than now — and reading a
   * replayed pre-navigation value is exactly how a guard used to open a create route without the gate
   * ever being consulted.
   */
  readonly #questions = new Subject<AgreementQuestion>();

  constructor() {
    this.#questions
      .pipe(
        mergeMap(question => (question.kind === 'ask' ? this.#answerFor(question.pair) : EMPTY)),
        takeUntilDestroyed(),
      )
      .subscribe();

    effect(() => this.#questions.next(this.#question()));
  }

  askAbout(partnerOrganizationId: number): void {
    const question = untracked(() => this.#questionForPartner(partnerOrganizationId));
    if (question.kind === 'ask') {
      this.#questions.next(question);
    }
  }

  grantsFor(partnerOrganizationId: number | undefined, permission: AgreementPermission): boolean {
    const question = this.#questionForPartner(partnerOrganizationId);
    if (question.kind !== 'ask') {
      return false;
    }

    return this.#answers().get(pairKey(question.pair))?.permissions?.has(permission) ?? false;
  }

  /**
   * The settled verdict for the partner `partnerParam` names, for a caller that must not refuse merely
   * because the answer has not arrived — a route guard on a typed URL or a bookmark (AC11b, R6).
   *
   * Emits **exactly once and completes**, never with {@link AgreementGateStatus.Checking}, and reads
   * every input at *subscribe* time so a value buffered beforehand cannot be mistaken for the current
   * one. Waits — bounded by {@link AGREEMENT_GATE_TIMEOUT_MS} — for bootstrap to say whether this is
   * even a distributor session, and settles as soon as it knows.
   */
  settleFor(partnerParam: string | null): Observable<AgreementGateDecision> {
    return defer(() => this.#settle(partnerParam)).pipe(
      timeout({ each: AGREEMENT_GATE_TIMEOUT_MS, with: () => of(this.#expired(partnerParam)) }),
      // The underlying request does not complete on its own. Without this the caller's subscription —
      // and the request behind it — would outlive the navigation it was asked about.
      take(1),
    );
  }

  /**
   * A settled, stamped answer for `pair`: the one already in hand, or a fresh bounded request.
   *
   * **One answer per pair per session.** Reuse makes a click on an already-`Allowed` CTA instant instead
   * of a second round trip.
   */
  #answerFor(pair: AgreementPair): Observable<AgreementAnswer> {
    const key = pairKey(pair);
    const known = untracked(this.#answers).get(key);
    // `permissions === null` is exactly `Unavailable`: a non-answer is never cached, so a failed or
    // expired check is retried rather than pinning the pair on a refusal for the rest of the session.
    if (known !== undefined && known.permissions !== null) {
      return of(known);
    }

    return this.#inFlight.get(key) ?? this.#ask(pair, key);
  }

  #ask(pair: AgreementPair, key: string): Observable<AgreementAnswer> {
    const request = this.#client.getAgreementPermissions(pair.distributorOrganizationId, pair.targetOrganizationId).pipe(
      map(response => toAnswer(pair, response)),
      // The facade normalizes HTTP failures into the envelope; this is defence in depth against a
      // genuinely thrown error arriving as a dead stream and pinning the button on `Checking`.
      catchError(() => of(unavailableFor(pair))),
      // Bounds the button too, not only the guard: without this a hung request pins it on `Checking`
      // for the rest of the session.
      timeout({ each: AGREEMENT_GATE_TIMEOUT_MS, with: () => of(unavailableFor(pair)) }),
      tap(answer => {
        this.#inFlight.delete(key);
        this.#record(answer);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.#inFlight.set(key, request);

    return request;
  }

  get #businessAsOrganizationEnabled(): boolean {
    return this.#businessAsOrganizationFlag.isEnabled();
  }

  #expired(partnerParam: string | null): AgreementGateDecision {
    return { partnerOrganizationId: this.#targetFor(partnerParam), status: AgreementGateStatus.Unavailable };
  }

  #partnerForParam(partnerParam: string | null): DistributorPartnerConfig | null {
    return resolveSelectedPartner(partnerParam, this.#partnersService.partners(), candidates =>
      readRememberedPartner(this.#storage, candidates, this.#store.organizationId()),
    );
  }

  #questionFor(partner: DistributorPartnerConfig | null): AgreementQuestion {
    // The flag is read non-reactively (it cannot change mid-session), matching the convention in
    // MyReservationsListComponent. `!== true` because isFeatureEnabled() also returns null.
    if (!this.#businessAsOrganizationEnabled) {
      return { kind: 'notApplicable' };
    }

    const sessionState = this.#store.sessionState();
    if (sessionState === DistributorSessionState.Unknown) {
      return { kind: 'sessionUnresolved' };
    }
    if (sessionState === DistributorSessionState.NotADistributor) {
      return { kind: 'notApplicable' };
    }
    if (partner === null) {
      return { kind: 'noPartner' };
    }

    // Read fresh rather than cached: PartnerService.getPartner() is not a signal, and an organization
    // switch clears the session store, so this recomputes with the new organization.
    const distributorOrganizationId = this.#partnerService.getPartner()?.id;
    if (distributorOrganizationId === undefined) {
      // A partner to ask about but no distributor to ask for: §4.7 makes that a refusal, so it must not
      // read as `NotAsked` — a guard opens on that.
      return { kind: 'unanswerable' };
    }

    return {
      kind: 'ask',
      pair: {
        distributorOrganizationId,
        sessionGeneration: this.#store.sessionGeneration(),
        targetOrganizationId: partner.partnerOrganizationId,
      },
    };
  }

  #questionForParam(partnerParam: string | null): AgreementQuestion {
    const question = this.#questionFor(this.#partnerForParam(partnerParam));

    return question.kind === 'noPartner' && partnerParam !== null ? { kind: 'unusableParam' } : question;
  }

  #questionForPartner(partnerOrganizationId: number | undefined): AgreementQuestion {
    if (partnerOrganizationId === undefined) {
      return { kind: 'noPartner' };
    }

    const partner = this.#partnersService.partners().find(candidate => candidate.partnerOrganizationId === partnerOrganizationId);

    return this.#questionFor(partner ?? null);
  }

  #record(answer: AgreementAnswer): void {
    const generation = untracked(this.#store.sessionGeneration);
    if (answer.pair.sessionGeneration !== generation) {
      return;
    }

    const live = new Map<string, AgreementAnswer>();
    for (const [key, kept] of untracked(this.#answers)) {
      if (kept.pair.sessionGeneration === generation) {
        live.set(key, kept);
      }
    }
    live.set(pairKey(answer.pair), answer);

    this.#answers.set(live);
  }

  #settle(partnerParam: string | null): Observable<AgreementGateDecision> {
    const question = untracked(() => this.#questionForParam(partnerParam));
    const partnerOrganizationId = this.#targetFor(partnerParam);

    switch (question.kind) {
      case 'ask':
        return this.#answerFor(question.pair).pipe(map(answer => ({ partnerOrganizationId, status: verdictOf(answer) })));
      case 'noPartner':
      case 'notApplicable':
        return of({ partnerOrganizationId, status: AgreementGateStatus.NotAsked });
      case 'sessionUnresolved':
        return this.#store.whenResolved().pipe(switchMap(() => this.#settle(partnerParam)));
      case 'unanswerable':
      case 'unusableParam':
        return of({ partnerOrganizationId, status: AgreementGateStatus.Unavailable });
    }
  }

  #targetFor(partnerParam: string | null): number | null {
    return untracked(() => this.#partnerForParam(partnerParam)?.partnerOrganizationId ?? null);
  }
}

function pairKey(pair: AgreementPair): string {
  return `${pair.distributorOrganizationId}:${pair.targetOrganizationId}:${pair.sessionGeneration}`;
}

function samePair(a: AgreementPair, b: AgreementPair): boolean {
  return (
    a.distributorOrganizationId === b.distributorOrganizationId &&
    a.targetOrganizationId === b.targetOrganizationId &&
    a.sessionGeneration === b.sessionGeneration
  );
}

function sameQuestion(a: AgreementQuestion, b: AgreementQuestion): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  return a.kind !== 'ask' || b.kind !== 'ask' || samePair(a.pair, b.pair);
}

function unavailableFor(pair: AgreementPair): AgreementAnswer {
  return { pair, permissions: null };
}

/**
 * `data === null` is the missing answer the library keeps distinct from an empty set; both it and an
 * error mean *we do not know*, which is `Unavailable` and so a refusal — never a tentative yes.
 */
function toAnswer(pair: AgreementPair, response: BaseResponse<AgreementPermission[]>): AgreementAnswer {
  if (response.error !== null || response.data === null) {
    return unavailableFor(pair);
  }

  return { pair, permissions: new Set(response.data) };
}

/** The reserve verdict, derived so that it and the set it describes cannot disagree. */
function verdictOf(answer: AgreementAnswer): AgreementVerdict {
  if (answer.permissions === null) {
    return AgreementGateStatus.Unavailable;
  }

  return answer.permissions.has(AGREEMENT_RESERVE_PERMISSION) ? AgreementGateStatus.Allowed : AgreementGateStatus.NotAllowed;
}
