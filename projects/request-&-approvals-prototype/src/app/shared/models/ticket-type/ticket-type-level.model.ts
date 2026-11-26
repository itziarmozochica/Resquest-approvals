import { TicketType } from './ticket-type.model';

export class TicketTypeLevel {
  children: TicketTypeLevel[] = [];
  displayName = '';
  index = 0;
  selected = false;
  ticketTypes: TicketType[] = [];

  addChildren(ticketType: TicketType, childrenLevels: string[]): void {
    const displayName = childrenLevels.shift();
    const childrenLevel = this.children.find(level => level.displayName == displayName);
    if (childrenLevels.length === 0) {
      this.ticketTypes.push(ticketType);
      return;
    }
    if (childrenLevel) {
      childrenLevel.addChildren(ticketType, childrenLevels);
    } else if (displayName !== undefined) {
      this.children.push(new TicketTypeLevel().generateLevel(displayName, childrenLevels, ticketType, this.index + 1));
    }
  }

  generateLevel(displayName: string, childrenLevels: string[], ticketType: TicketType, index?: number): TicketTypeLevel {
    this.displayName = displayName;
    this.index = index ? index : 0;
    if (childrenLevels.length > 0) {
      this.addChildren(ticketType, childrenLevels);
    } else {
      this.ticketTypes.push(ticketType);
    }
    return this;
  }

  isDisabled(): boolean {
    if (this.ticketTypes.length === 0) {
      return this.children.every(child => child.isDisabled());
    }
    return this.ticketTypes.every(ticketType => ticketType.availableTickets === 0);
  }

  selectedActiveTicketTypes(): TicketType[] {
    this.selected = true;
    const activeChildren = this.children.filter(child => !child.isDisabled());
    if (activeChildren.length > 0) {
      return activeChildren[0].selectedActiveTicketTypes();
    }
    if (this.ticketTypes.length > 0) {
      return this.ticketTypes;
    }
    return [];
  }

  unselectLevel(): void {
    this.selected = false;
    this.children.forEach(child => child.unselectLevel());
  }
}
