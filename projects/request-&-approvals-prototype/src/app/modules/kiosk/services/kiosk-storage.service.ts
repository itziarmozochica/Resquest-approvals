import { Injectable } from '@angular/core';

import { KioskCategoryGroup } from '@fz-original/app/modules/kiosk/models/kiosk-category-group.model';
import { KioskPlanDetail, KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { Channel as SessionChannel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { BehaviorSubject, Observable } from 'rxjs';

import { KioskOnsiteSetup } from '../../box-office/shared/models/kiosk-onsite-setup';
import { KioskAppParams } from '../models/kiosk-app-params.model';
import { KioskConfiguration } from '../models/kiosk-configuration';
import { getKioskChannelId } from '../utils/kiosk-ch.util';

const KIOSK_APP_PARAMS_KEY = 'kiosk';
const KIOSK_CONFIGURATION_KEY = 'kiosk-configuration';
const KIOSK_ONSITE_SETUP_KEY = 'kiosk-onsite-setup';
const KIOSK_PLAN_KEY = 'kiosk-plan';
const KIOSK_PLANS_KEY_PREFIX = 'kiosk-plans:';
const KIOSK_CATEGORY_GROUPS_KEY_PREFIX = 'kiosk-category-groups:';

@Injectable({
  providedIn: 'root',
})
export class KioskStorageService {
  private setupInfo = new BehaviorSubject<KioskOnsiteSetup | null>(this.getOnsiteSetup());
  #planLangs = new Set<string>();
  #categoryGroupLangs = new Set<string>();

  getConfiguration(): KioskConfiguration | null {
    const params = localStorage.getItem(KIOSK_CONFIGURATION_KEY);
    return params ? JSON.parse(params) : null;
  }

  getAppParams(): KioskAppParams | null {
    const params = localStorage.getItem(KIOSK_APP_PARAMS_KEY);
    return params ? JSON.parse(params) : null;
  }

  getOnsiteSetup(): KioskOnsiteSetup | null {
    return JSON.parse(localStorage.getItem(KIOSK_ONSITE_SETUP_KEY) ?? 'null');
  }

  getPlan(): KioskPlanDetail | null {
    const planStr = localStorage.getItem(KIOSK_PLAN_KEY);
    return planStr ? JSON.parse(planStr) : null;
  }

  getChannelId(): string {
    return getKioskChannelId(this.getConfiguration()?.channelId) ?? SessionChannel.Kiosk;
  }

  getPlanItems(lang: string): KioskPlanItem[] | null {
    return JSON.parse(localStorage.getItem(KIOSK_PLANS_KEY_PREFIX + lang) ?? 'null');
  }

  observeSetup(): Observable<KioskOnsiteSetup | null> {
    return this.setupInfo.asObservable();
  }

  setConfiguration(configuration: KioskConfiguration): void {
    const newValue: string = JSON.stringify(configuration);
    localStorage.setItem(KIOSK_CONFIGURATION_KEY, newValue);
  }

  setAppParams(params: KioskAppParams): void {
    const newValue: string = JSON.stringify(params);
    localStorage.setItem(KIOSK_APP_PARAMS_KEY, newValue);
  }

  setOnsiteSetup(setup?: KioskOnsiteSetup): void {
    if (setup === undefined) {
      localStorage.removeItem(KIOSK_ONSITE_SETUP_KEY);
      this.setupInfo.next(null);
      return;
    }
    localStorage.setItem(KIOSK_ONSITE_SETUP_KEY, JSON.stringify(setup));
    this.setupInfo.next(setup);
  }

  setPlan(plan: KioskPlanDetail): void {
    const newValue: string = JSON.stringify(plan);
    localStorage.setItem(KIOSK_PLAN_KEY, newValue);
  }

  setPlanItems(lang: string, plans: KioskPlanItem[]): void {
    localStorage.setItem(KIOSK_PLANS_KEY_PREFIX + lang, JSON.stringify(plans));
    this.#planLangs.add(lang);
  }

  getCategoryGroups(lang: string): KioskCategoryGroup[] | null {
    return JSON.parse(localStorage.getItem(KIOSK_CATEGORY_GROUPS_KEY_PREFIX + lang) ?? 'null');
  }

  setCategoryGroups(lang: string, groups: KioskCategoryGroup[]): void {
    localStorage.setItem(KIOSK_CATEGORY_GROUPS_KEY_PREFIX + lang, JSON.stringify(groups));
    this.#categoryGroupLangs.add(lang);
  }

  clearPlansCaches(): void {
    const keysFromStorage: string[] = Object.keys(localStorage).filter(
      (key: string) => key.startsWith(KIOSK_PLANS_KEY_PREFIX) || key.startsWith(KIOSK_CATEGORY_GROUPS_KEY_PREFIX),
    );
    const keysFromMemory: string[] = [
      ...[...this.#planLangs].map((lang: string) => KIOSK_PLANS_KEY_PREFIX + lang),
      ...[...this.#categoryGroupLangs].map((lang: string) => KIOSK_CATEGORY_GROUPS_KEY_PREFIX + lang),
    ];
    const allKeys: Set<string> = new Set([...keysFromStorage, ...keysFromMemory]);
    for (const key of allKeys) {
      localStorage.removeItem(key);
    }
    this.#planLangs.clear();
    this.#categoryGroupLangs.clear();
  }
}
