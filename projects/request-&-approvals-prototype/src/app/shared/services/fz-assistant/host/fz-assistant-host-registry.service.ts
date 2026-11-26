import { Injectable } from '@angular/core';

import { FzAssistantHostRegistry } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';
import { FzAssistantRegisteredHost } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-host.model';

@Injectable({
  providedIn: 'root',
})
export class FzAssistantHostRegistryService implements FzAssistantHostRegistry {
  // Ordered stack: last connected registration is active (V1 last-writer-wins). Detached
  // entries are skipped by getActiveHost but not evicted — temporary DOM detach (e.g. overlay
  // animation) must not drop a host. [fzAssistantHost] must unregister on destroy so the root
  // singleton does not pin Element/config forever.
  #hosts: FzAssistantRegisteredHost[] = [];

  getActiveHost(): FzAssistantRegisteredHost | null {
    for (let index = this.#hosts.length - 1; index >= 0; index -= 1) {
      const host = this.#hosts[index];
      if (host.element.isConnected) {
        return host;
      }
    }

    return null;
  }

  register(host: FzAssistantRegisteredHost): void {
    this.#hosts = [...this.#hostsWithout(host), host];
  }

  unregister(host: FzAssistantRegisteredHost): void {
    this.#hosts = this.#hostsWithout(host);
  }

  #hostsWithout(host: FzAssistantRegisteredHost): FzAssistantRegisteredHost[] {
    return this.#hosts.filter((entry: FzAssistantRegisteredHost) => entry.element !== host.element);
  }
}
