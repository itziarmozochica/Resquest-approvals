import { computed, Injectable, Signal, signal } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';

@Injectable({
  providedIn: 'root',
})
export class ImpersonationMetadataService {
  readonly #impersonatedUserName = signal(localStorage.getItem(StorageKey.impersonatedUserName) ?? '');
  readonly #impersonatedUserRole = signal(localStorage.getItem(StorageKey.impersonatedUserRole) ?? '');
  readonly #impersonationSessionId = signal(localStorage.getItem(StorageKey.impersonationSessionId) ?? '');
  readonly #isImpersonationActive = signal(localStorage.getItem(StorageKey.impersonationActive) === 'true');
  readonly impersonatedUserName: Signal<string> = this.#impersonatedUserName.asReadonly();
  readonly impersonatedUserRole: Signal<string> = this.#impersonatedUserRole.asReadonly();
  readonly impersonationSessionId: Signal<string> = this.#impersonationSessionId.asReadonly();
  readonly isImpersonating: Signal<boolean> = computed(() => this.#isImpersonationActive() && this.#impersonationSessionId().length > 0);

  clear(): void {
    localStorage.removeItem(StorageKey.impersonationActive);
    localStorage.removeItem(StorageKey.impersonatedUserName);
    localStorage.removeItem(StorageKey.impersonatedUserRole);
    localStorage.removeItem(StorageKey.impersonationSessionId);
    this.#isImpersonationActive.set(false);
    this.#impersonatedUserName.set('');
    this.#impersonatedUserRole.set('');
    this.#impersonationSessionId.set('');
  }

  persist(userName: string, userRole: string, impersonationSessionId: string): void {
    localStorage.setItem(StorageKey.impersonationActive, 'true');
    localStorage.setItem(StorageKey.impersonatedUserName, userName);
    localStorage.setItem(StorageKey.impersonatedUserRole, userRole);
    localStorage.setItem(StorageKey.impersonationSessionId, impersonationSessionId);
    this.#isImpersonationActive.set(true);
    this.#impersonatedUserName.set(userName);
    this.#impersonatedUserRole.set(userRole);
    this.#impersonationSessionId.set(impersonationSessionId);
  }
}
