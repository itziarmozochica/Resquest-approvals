import { NgClass, NgFor, NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

import { TicketTypeLevel } from '../../models/ticket-type/ticket-type-level.model';
import { TicketType } from '../../models/ticket-type/ticket-type.model';

@Component({
  selector: 'app-ticket-selector-level',
  templateUrl: './ticket-selector-level.component.html',
  styleUrls: ['./ticket-selector-level.component.scss'],
  standalone: true,
  imports: [NgFor, NgTemplateOutlet, NgClass, IconsModule],
})
export class TicketSelectorLevelComponent implements OnChanges {
  levels: TicketTypeLevel[] = [];
  @Output() selectedLevel = new EventEmitter<TicketType[]>();
  @Input() ticketTypeCounterBySessionId = new Map<string, number>();
  @Input() ticketTypeCounterBySessionType = new Map<string, number>();
  @Input() ticketTypes: TicketType[] = [];

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
    if (changes.ticketTypes && !this.equalsSessions(changes.ticketTypes.currentValue, changes.ticketTypes.previousValue)) {
      this.levels = [];
      const explodedSessionLabels = new Map<string, string[]>();

      this.ticketTypes.forEach(ticketType => {
        const itemSplit = ticketType.name.split(ticketType.explodePipeLevelSeparator);

        if (this.ticketTypeCounterBySessionType.has(ticketType.name) && this.ticketTypeCounterBySessionType.get(ticketType.name)! > 0) {
          explodedSessionLabels.set(ticketType.name, [...itemSplit]);
        }

        const displayName = itemSplit.shift() ?? '';
        let level = this.levels.find(level => level.displayName == displayName);

        if (level) {
          level.addChildren(ticketType, itemSplit);
        } else {
          level = new TicketTypeLevel().generateLevel(displayName, itemSplit, ticketType);
          this.levels.push(level);
        }
      });
      this.selectLevelsByExplodedSessionLabels(explodedSessionLabels);
    }
  }

  private equalsSessions(currentSessions: TicketType[], previousSessions: TicketType[]): boolean {
    if (!previousSessions) {
      return false;
    }
    if (currentSessions.length !== previousSessions.length) {
      return false;
    }
    const difference = currentSessions.filter(
      currentSession => !previousSessions.some(previousSession => currentSession.compareWithSessionId(previousSession)),
    );
    return difference.length === 0;
  }

  protected selectLevelsByExplodedSessionLabels(explodedSessionLabels: Map<string, string[]>): void {
    if (explodedSessionLabels.size > 0) {
      explodedSessionLabels.forEach(explodedLabels => {
        this.levels.forEach(level => level.unselectLevel());
        this.selectActiveLevel(this.levels, explodedLabels);
      });
    } else {
      this.selectActiveLevel(this.levels);
    }
  }

  protected selectActiveLevel(levels: TicketTypeLevel[], explodedLabels?: string[]): void {
    let matchingLevel: TicketTypeLevel | undefined;
    if (explodedLabels !== undefined && explodedLabels.length > 0) {
      const displayName = explodedLabels.shift();
      matchingLevel = levels.find(level => level.displayName == displayName);
    } else {
      matchingLevel = levels.find(child => !child.isDisabled()) as TicketTypeLevel;
    }
    if (matchingLevel !== undefined) {
      matchingLevel.selected = true;
      if (matchingLevel.ticketTypes.length > 0) {
        this.selectedLevel.emit(matchingLevel.ticketTypes);
        return;
      }
      this.selectActiveLevel(matchingLevel.children, explodedLabels);
    }
  }

  selectLevel(level: TicketTypeLevel, siblingLevel: TicketTypeLevel[]): void {
    siblingLevel.forEach(level => level.unselectLevel());

    level.selected = true;

    if (level.ticketTypes.length > 0) {
      this.selectedLevel.emit(level.ticketTypes);
      return;
    }

    this.selectActiveLevel(level.children);
  }
}
