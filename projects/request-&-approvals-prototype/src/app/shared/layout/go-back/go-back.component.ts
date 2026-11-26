import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Params } from '@angular/router';

import { NavigationService } from '../../services/navigation/navigation.service';

@Component({
  selector: 'app-go-back',
  standalone: false,
  templateUrl: './go-back.component.html',
  styleUrls: ['./go-back.component.scss'],
})
export class GoBackComponent {
  #navigationService = inject(NavigationService);
  @Output() goBackEvent = new EventEmitter<void>();
  @Input() goBackTitle = '';
  @Input() navigate = true;
  @Input() queryParams: Params = {};
  @Input() urlGoBack = '';

  /**
   * What the link does beyond the navigation the anchor already performs.
   *
   * `urlGoBack` is bound straight to the anchor's `routerLink`, so for that case the link *is* the
   * navigation and there is nothing left to do here. Navigating a second time from this handler
   * started a second navigation to the same URL, and the router cancels the in-flight one the moment
   * a new one is scheduled — so one click produced `NavigationStart`, `NavigationCancel`, then a
   * second `NavigationStart`. Harmless on a plain page, not harmless on a route behind
   * `hasUnsavedChangesGuard`: the first navigation is thrown away before it can ask, and the prompt
   * the author answers belongs to the second.
   *
   * Every caller passes an absolute `urlGoBack`, so the anchor's route-relative resolution and the
   * root-relative one this used to do land on the same URL. `queryParams` reaches the anchor by the
   * same binding.
   *
   * The `navigationService.back()` branch stays: with no `urlGoBack` the anchor has no `routerLink`
   * to fire, and history is the only thing that can say where "back" is.
   */
  onGoBack(): void {
    this.goBackEvent.emit();

    if (!this.navigate || this.urlGoBack.length > 0) {
      return;
    }

    this.#navigationService.back();
  }
}
