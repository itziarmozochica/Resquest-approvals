import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  input,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { TicketTypeLevel } from './../../../../../shared/models/ticket-type/ticket-type-level.model';
import { TicketType } from './../../../../../shared/models/ticket-type/ticket-type.model';

@Component({
  selector: 'app-kiosk-ticket-selector-level',
  standalone: false,
  templateUrl: './kiosk-ticket-selector-level.component.html',
  styleUrls: ['./kiosk-ticket-selector-level.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskTicketSelectorLevelComponent implements OnChanges {
  hideSingleItemExplodePipeLevels = input(false);
  @Input() ticketTypes: TicketType[] = [];
  @Input() ticketTypeCounterBySessionId: Map<string, number> | null = new Map<string, number>();
  @Input() ticketTypeCounterBySessionType = new Map<string, number>();
  @Output() selectedLevel = new EventEmitter<TicketType[]>();

  #changeDetectorRef = inject(ChangeDetectorRef);

  levels: TicketTypeLevel[] = [];

  get levelRows(): TicketTypeLevel[][] {
    const rows: TicketTypeLevel[][] = this.levels.length > 0 ? [this.levels] : [];
    let selected = this.levels.find(level => level.selected);

    while (selected !== undefined && selected.children.length > 0) {
      rows.push(selected.children);
      selected = selected.children.find(child => child.selected);
    }

    return rows;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.ticketTypes && !this.#equalsSessions(changes.ticketTypes.currentValue, changes.ticketTypes.previousValue)) {
      this.#resetLevels();
      this.#processTicketTypes();
      this.#selectLevelsByExplodedSessionLabels(this.#getExplodedSessionLabels());
      this.#autoTraverseSingleItemLevels();
      this.#changeDetectorRef.markForCheck();
    }
  }

  getVisibleLevels(siblings: TicketTypeLevel[]): TicketTypeLevel[] {
    if (!this.hideSingleItemExplodePipeLevels() || siblings.length !== 1) {
      return siblings;
    }

    return [];
  }

  selectLevel(level: TicketTypeLevel, siblingLevels: TicketTypeLevel[]): void {
    siblingLevels.forEach(sibling => sibling.unselectLevel());
    level.selected = true;

    if (level.ticketTypes.length > 0) {
      this.selectedLevel.emit(level.ticketTypes);
    } else {
      this.#selectActiveLevel(level.children);
      this.#autoTraverseSingleItemLevels(level.children);
    }

    this.#changeDetectorRef.markForCheck();
  }

  #resetLevels(): void {
    this.levels = [];
  }

  #getExplodedSessionLabels(): Map<string, string[]> {
    return this.ticketTypes.reduce((acc, ticketType) => {
      const sessionLabels: string[] = ticketType.name.split(ticketType.explodePipeLevelSeparator);
      if (this.ticketTypeCounterBySessionType.has(ticketType.name) && this.ticketTypeCounterBySessionType.get(ticketType.name)! > 0) {
        acc.set(ticketType.name, [...sessionLabels]);
      }
      return acc;
    }, new Map<string, string[]>());
  }

  #processTicketTypes(): void {
    this.levels = this.ticketTypes.reduce((acc: TicketTypeLevel[], ticketType) => {
      const itemSplit = ticketType.name.split(ticketType.explodePipeLevelSeparator);
      const displayName = itemSplit.shift();

      if (!displayName) return acc;

      let level = acc.find(level => level.displayName === displayName);
      if (level) {
        level.addChildren(ticketType, itemSplit);
      } else {
        level = new TicketTypeLevel().generateLevel(displayName, itemSplit, ticketType);
        acc.push(level);
      }
      return acc;
    }, []);
  }

  #equalsSessions(current: TicketType[], previous: TicketType[]): boolean {
    if (!previous || current.length !== previous.length) {
      return false;
    }
    return !current.some(session => !previous.some(prev => session.compareWithSessionId(prev)));
  }

  #selectLevelsByExplodedSessionLabels(labels: Map<string, string[]>): void {
    if (labels.size > 0) {
      labels.forEach(label => {
        this.levels.forEach(level => level.unselectLevel());
        this.#selectActiveLevel(this.levels, label);
      });
    } else {
      this.#selectActiveLevel(this.levels);
    }
  }

  #selectActiveLevel(levels: TicketTypeLevel[], labels?: string[]): void {
    const matchingLevel: TicketTypeLevel | undefined = labels?.length
      ? levels.find(level => level.displayName === labels[0])
      : levels.find(level => !level.isDisabled());

    if (matchingLevel !== undefined) {
      matchingLevel.selected = true;

      if (matchingLevel.ticketTypes.length > 0) {
        this.selectedLevel.emit(matchingLevel.ticketTypes);
      } else {
        this.#selectActiveLevel(matchingLevel.children, labels?.slice(1));
      }
    }
  }

  #autoTraverseSingleItemLevels(siblings: TicketTypeLevel[] = this.levels): void {
    if (!this.hideSingleItemExplodePipeLevels()) {
      return;
    }

    let currentSiblings = siblings;

    while (currentSiblings.length === 1) {
      const onlyLevel = currentSiblings[0];

      if (onlyLevel.ticketTypes.length > 0) {
        if (!onlyLevel.selected) {
          onlyLevel.selected = true;
          this.selectedLevel.emit(onlyLevel.ticketTypes);
        }
        return;
      }

      if (onlyLevel.children.length === 0) {
        return;
      }

      onlyLevel.selected = true;
      currentSiblings = onlyLevel.children;
    }
  }
}
