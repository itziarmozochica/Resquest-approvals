import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, LOCALE_ID } from '@angular/core';

import { EntityEditHistoryEntry } from '@fz-original/app/shared/models/edit-history/edit-history.model';
import { translationRevisionSignal } from '@fz-original/app/shared/utils/translation-revision.signal.util';
import { IgntTableColumnComponent, IgntTableColumnTemplateDirective, IgntTableComponent } from '@ignite/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ActivityRow, DisplayRow, FlatRow, ItemChangeRow } from '../../models/edit-history-view.model';
import { flatRowsFromLegacyLines } from '../../utils/edit-history-legacy-lines.util';
import { clipForCell, flatRowIsRealChange, flattenStructuredPayload, groupRowsByPrimarySection } from '../../utils/edit-history-view.util';
import { ziflowDecisionSentiment } from '../../utils/ziflow-decision-sentiment.util';

const GENERAL_SECTION = '__ir_approval_general__';

function instantOf(at: string): number | null {
  const parsed = Date.parse(at);
  return Number.isNaN(parsed) ? null : parsed;
}

function newestFirst(a: string, b: string): number {
  const left = instantOf(a);
  const right = instantOf(b);
  if (left === null || right === null) return Number(left === null) - Number(right === null);
  return right - left;
}

const ZIFLOW_DECISIONS = new Set(['approved', 'approved_with_changes', 'changes_required', 'not_relevant', 'withdrawn']);

interface SummaryWithItem {
  before: string;
  item: string;
  after: string;
}

interface EntryView {
  at: string;
  atLabel: string;
  actor: string;
  summary: string;
  summaryWithItem: SummaryWithItem | null;
  rows: DisplayRow[];
  itemChanges: ItemChangeRow[];
  activityChanges: ActivityRow[];
}

function entryDisplayRows(entry: EntityEditHistoryEntry): DisplayRow[] {
  if (entry.activityChanges?.length) {
    return [];
  }
  let flat: FlatRow[] = [];
  const structured = entry.structuredChanges;
  if (structured && structured.questions.length > 0) {
    flat = flattenStructuredPayload(structured);
  }
  if (flat.length === 0 && entry.changes && entry.changes.length > 0) {
    flat = flatRowsFromLegacyLines(entry.changes);
  }
  const filtered = flat.filter(flatRowIsRealChange);
  const rows: DisplayRow[] = [];
  for (const group of groupRowsByPrimarySection(filtered, GENERAL_SECTION)) {
    for (const r of group.rows) {
      const field = group.section === GENERAL_SECTION ? r.field : `${group.section} · ${r.field}`;
      rows.push({ field, before: clipForCell(r.before), after: clipForCell(r.after) });
    }
  }
  return rows;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntTableComponent, IgntTableColumnComponent, IgntTableColumnTemplateDirective],
  selector: 'app-edit-history-view',
  standalone: true,
  styleUrl: './edit-history-view.component.scss',
  templateUrl: './edit-history-view.component.html',
})
export class EditHistoryViewComponent {
  readonly entries = input<EntityEditHistoryEntry[]>([]);

  readonly #translate = inject(TranslateService);
  readonly #locale = inject(LOCALE_ID);
  readonly #revision = translationRevisionSignal(this.#translate);

  readonly views = computed<EntryView[]>(() => {
    this.#revision();
    return [...this.entries()].map(entry => this.#toView(entry)).sort((a, b) => newestFirst(a.at, b.at));
  });

  #toView(entry: EntityEditHistoryEntry): EntryView {
    const actor = entry.actorEmail ?? entry.actorUserId ?? this.#translate.instant('editHistory.unknownActor');
    const atLabel = this.#instant(entry.at);
    if (entry.commentEdit) {
      return {
        at: entry.at,
        atLabel,
        actor,
        summary: this.#translate.instant('editHistory.commentEdited', { item: entry.commentEdit.itemLabel }),
        summaryWithItem: this.#commentEditSummary(entry.commentEdit.itemLabel),
        rows: [],
        itemChanges: [],
        activityChanges: [],
      };
    }
    return {
      at: entry.at,
      atLabel,
      actor,
      summary: entry.summary,
      summaryWithItem: null,
      rows: entryDisplayRows(entry),
      itemChanges: (entry.itemChanges ?? []).map(change => ({
        label: clipForCell(change.label),
        fromStatus: this.#status(change.fromStatus),
        toStatus: this.#status(change.toStatus),
        editedAt: atLabel,
        changedBy: actor,
      })),
      activityChanges: [...(entry.activityChanges ?? [])]
        .sort((a, b) => newestFirst(a.at ?? entry.at, b.at ?? entry.at))
        .map(change => ({
          decision: this.#decision(change.decision),
          decisionSentiment: ziflowDecisionSentiment(change.decision),
          asset: clipForCell(change.asset.name),
          decidedAt: change.at ? this.#instant(change.at) : atLabel,
        })),
    };
  }

  #commentEditSummary(item: string): SummaryWithItem {
    const marker = '\u0000';
    const sentence: string = this.#translate.instant('editHistory.commentEdited', { item: marker });
    const index = sentence.indexOf(marker);
    if (index < 0) {
      return { before: sentence, item: '', after: '' };
    }
    return { before: sentence.slice(0, index), item, after: sentence.slice(index + marker.length) };
  }

  #instant(at: string): string {
    if (instantOf(at) === null) return at;
    const locale = this.#translate.currentLang || this.#locale;
    return `${formatDate(at, 'medium', locale)} ${formatDate(at, 'z', locale)}`;
  }

  #status(status: string): string {
    return this.#translate.instant(`editHistory.itemStatus.${status.toLowerCase()}`);
  }

  #decision(decision: string): string {
    const key = decision.toLowerCase();
    return ZIFLOW_DECISIONS.has(key) ? this.#translate.instant(`editHistory.ziflowDecision.${key}`) : decision;
  }
}
