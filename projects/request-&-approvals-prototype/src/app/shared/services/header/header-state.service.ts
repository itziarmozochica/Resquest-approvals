import { Injectable, Signal, TemplateRef } from '@angular/core';

import { Constructor } from '@fz-original/app/app/mixins/constructor';
import { emptyBase } from '@fz-original/app/app/mixins/empty';
import { StateMixin } from '@fz-original/app/app/mixins/state/state.mixin';
import { HeaderState } from '@fz-original/app/shared/models/header/header-state.model';
import { Subject } from 'rxjs';

import { MenuItem } from '../../models/header/header.model';
import { headerStateInitial } from './header-state.initial';

@Injectable({
  providedIn: 'root',
})
export class HeaderStateService extends StateMixin<Constructor, HeaderState>(emptyBase, headerStateInitial) {
  #actionClicked$ = new Subject<string>();

  centerAdjacentContent: Signal<TemplateRef<unknown> | null> = this.getStateProp('centerAdjacentContent');
  centerContent: Signal<TemplateRef<unknown> | null> = this.getStateProp('centerContent');

  actionClicked$ = this.#actionClicked$.asObservable();
  featureMenuItems: Signal<MenuItem[]> = this.getStateProp('featureMenuItems');
  globalMenuItems: Signal<MenuItem[]> = this.getStateProp('globalMenuItems');
  headerActions: Signal<MenuItem[]> = this.getStateProp('headerActions');
  readonly isMenuOpen: Signal<boolean> = this.getStateProp('isMenuOpen');

  clearCenterAdjacentContent(): void {
    this.updateStateProp('centerAdjacentContent', null);
  }

  clearCenterContent(): void {
    this.updateStateProp('centerContent', null);
  }

  clearFeatureMenuItems(): void {
    this.updateStateProp('featureMenuItems', []);
  }

  clearHeaderActions(): void {
    this.updateStateProp('headerActions', []);
  }

  closeMenu(): void {
    this.updateStateProp('isMenuOpen', false);
  }

  actionClick(actionId: string): void {
    this.#actionClicked$.next(actionId);
  }

  openMenu(): void {
    this.updateStateProp('isMenuOpen', true);
  }

  setCenterAdjacentContent(template: TemplateRef<unknown> | null): void {
    this.updateStateProp('centerAdjacentContent', template);
  }

  setCenterContent(template: TemplateRef<unknown> | null): void {
    this.updateStateProp('centerContent', template);
  }

  setFeatureMenuItems(items: MenuItem[]): void {
    this.updateStateProp('featureMenuItems', items);
  }

  setGlobalMenuItems(items: MenuItem[]): void {
    this.updateStateProp('globalMenuItems', items);
  }

  setHeaderActions(actions: MenuItem[]): void {
    this.updateStateProp('headerActions', actions);
  }

  toggleMenu(): void {
    const currentValue = this.state().isMenuOpen;
    this.updateStateProp('isMenuOpen', !currentValue);
  }
}
