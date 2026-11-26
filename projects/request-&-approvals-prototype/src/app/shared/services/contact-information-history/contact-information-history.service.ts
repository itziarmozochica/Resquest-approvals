import { Injectable } from '@angular/core';

import { ContactInformationHistory } from './contact-information-history.model';

const MAX_HISTORY_ITEMS = 10;

@Injectable({
  providedIn: 'root',
})
export class ContactInformationHistoryService {
  #history: ContactInformationHistory[] = [];

  getHistory(): ContactInformationHistory[] {
    return [...this.#history].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }

  saveContactInformation(firstName: string, lastName: string, email: string, phoneNumber = ''): void {
    if (!firstName && !lastName && !email && !phoneNumber) {
      return;
    }

    const newEntry: ContactInformationHistory = {
      dateTime: new Date().toISOString(),
      email,
      firstName,
      lastName,
      ...(phoneNumber ? { phoneNumber } : {}),
    };

    const filteredHistory = this.#history.filter(
      item =>
        item.firstName !== newEntry.firstName ||
        item.lastName !== newEntry.lastName ||
        item.email !== newEntry.email ||
        (item.phoneNumber ?? '') !== phoneNumber,
    );

    this.#history = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
  }
}
