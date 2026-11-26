import { NgClass, NgFor, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { TicketTypeLevel } from '../../models/ticket-type/ticket-type-level.model';
import { TicketSelectorLevelComponent } from '../ticket-selector-level/ticket-selector-level.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgFor, NgTemplateOutlet],
  selector: 'ticket-selector-level-obo',
  styleUrl: './ticket-selector-level-obo.component.scss',
  templateUrl: './ticket-selector-level-obo.component.html',
})
export class TicketSelectorLevelOboComponent extends TicketSelectorLevelComponent {
  readonly #lastOpenedPath = signal<readonly string[] | null>(null);

  override selectLevel(level: TicketTypeLevel, siblingLevel: TicketTypeLevel[]): void {
    super.selectLevel(level, siblingLevel);
    this.#lastOpenedPath.set(this.#selectedPath());
  }

  protected override selectLevelsByExplodedSessionLabels(explodedSessionLabels: Map<string, string[]>): void {
    const lastOpenedPath = this.#lastOpenedPath();
    const reopenableLevels = lastOpenedPath === null ? [] : this.#reopenableLevels(lastOpenedPath);
    const deepestLevel = reopenableLevels.at(-1);
    if (deepestLevel !== undefined) {
      reopenableLevels.slice(0, -1).forEach(level => (level.selected = true));
      this.#openOnSaleLevel(deepestLevel);
      return;
    }
    const stagedPath = [...explodedSessionLabels.values()].at(-1);
    this.selectActiveLevel(this.levels, stagedPath === undefined ? undefined : [...stagedPath]);
  }

  #hasOwnTicketsOnSale(level: TicketTypeLevel): boolean {
    return level.ticketTypes.some(ticketType => ticketType.availableTickets !== 0);
  }

  #isOnSale(level: TicketTypeLevel): boolean {
    return this.#hasOwnTicketsOnSale(level) || level.children.some(child => this.#isOnSale(child));
  }

  #openOnSaleLevel(level: TicketTypeLevel): void {
    level.selected = true;
    if (this.#hasOwnTicketsOnSale(level)) {
      this.selectedLevel.emit(level.ticketTypes);
      return;
    }
    const onSaleChild = level.children.find(child => this.#isOnSale(child));
    if (onSaleChild !== undefined) {
      this.#openOnSaleLevel(onSaleChild);
    }
  }

  #reopenableLevels(path: readonly string[]): TicketTypeLevel[] {
    const reopenableLevels: TicketTypeLevel[] = [];
    let levels = this.levels;
    for (const displayName of path) {
      const openedLevel = levels.find(level => level.displayName === displayName);
      if (openedLevel === undefined || !this.#isOnSale(openedLevel)) {
        break;
      }
      reopenableLevels.push(openedLevel);
      levels = openedLevel.children;
    }
    return reopenableLevels;
  }

  #selectedPath(): string[] {
    const path: string[] = [];
    let selected = this.levels.find(level => level.selected);
    while (selected !== undefined) {
      path.push(selected.displayName);
      selected = selected.children.find(child => child.selected);
    }
    return path;
  }
}
