import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  signal,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { AlertDirectoryRow } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';
import { AlertDirectoryService } from '@fz-original/app/shared/services/alert-directory/alert-directory.service';
import { PartnerAlertSettingsService } from '@fz-original/app/shared/services/partner-alert-settings/partner-alert-settings.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { SlackChannel } from '@fz-original/app/shared/services/slack-channels/slack-channels.model';
import { SlackChannelsService } from '@fz-original/app/shared/services/slack-channels/slack-channels.service';
import { SlackUserIdOverrideService } from '@fz-original/app/shared/services/slack-user-id-override/slack-user-id-override.service';
import { IgntButtonComponent, IgntTooltipDirective } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import {
  AlertDirectories,
  alertDirectoryLoadFailedError,
  alertDirectoryLoadingError,
  FinalizeAlertConfigResult,
} from '../../models/alert-config-finalize.model';
import {
  AlertConfigFormValue,
  AlertLocale,
  ApprovalValidationMode,
  createDefaultAlertConfig,
  DEFAULT_ALERT_CONFIG,
  RecipientDelivery,
  ReminderFrequency,
  selectedRecipients,
} from '../../models/alert-config.model';
import { FeverContactPicked } from '../../models/fever-directory.model';
import { OverridePatch, RowPatch } from '../../models/recipient-delivery-table.model';
import { AlertConfigPrefetchService } from '../../services/alert-config-prefetch.service';
import { FeverPmDirectoryService } from '../../services/fever-pm-directory.service';
import { finalizeAlertConfigForPersist } from '../../utils/alert-config-finalize.util';
import { buildTimezoneOptions, customDaysRequiredWhenCustom, timezoneAndHourRequired } from '../../utils/alert-config-form-validators.util';
import { withRecipientPermissions } from '../../utils/alert-config-payload.util';
import { FeverContactPickerComponent } from './fever-contact-picker/fever-contact-picker.component';
import { RecipientDeliveryTableComponent } from './recipient-delivery-table/recipient-delivery-table.component';

interface AlertConfigScalarsForm {
  alertsEnabled: FormControl<boolean>;
  validationMode: FormControl<ApprovalValidationMode>;
  locale: FormControl<AlertLocale>;
  frequency: FormControl<ReminderFrequency>;
  customReminderIntervalDays: FormControl<number | null>;
  reminderTimezone: FormControl<string | null>;
  reminderLocalHour: FormControl<number | null>;
  bypassDigest: FormControl<boolean>;
}

const SLACK_USER_REGEX = /^U[A-Z0-9]{6,}$/i;
const MENTION_WRAPPERS = /^<@|>$/g;
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_INJECTED_CONTACT = 'jon.garnica@example.com';
const FREQUENCY_OPTIONS: ReminderFrequency[] = ['every_day', 'every_2_days', 'every_3_days', 'every_week', 'custom'];
const VALIDATION_MODE_OPTIONS: ApprovalValidationMode[] = ['only_one', 'everyone'];
const LOCALE_OPTIONS: AlertLocale[] = ['en', 'es', 'fr', 'it', 'de'];
const HOUR_OPTIONS: number[] = Array.from({ length: 24 }, (_, i) => i);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    IgntToggleComponent,
    IgntButtonComponent,
    IgntInputFieldComponent,
    IgntTooltipDirective,
    IgntIconButtonComponent,
    RecipientDeliveryTableComponent,
    FeverContactPickerComponent,
  ],
  providers: [{ provide: NG_VALUE_ACCESSOR, multi: true, useExisting: forwardRef(() => AlertConfigFormComponent) }],
  selector: 'app-alert-config-form',
  standalone: true,
  styleUrl: './alert-config-form.component.scss',
  templateUrl: './alert-config-form.component.html',
})
export class AlertConfigFormComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() partnerId: number | null = null;
  @Input() projectId: string | null = null;
  @Input() currentUserEmail: string | null = null;
  @Input() showValidationMode = false;

  readonly form: FormGroup<AlertConfigScalarsForm>;
  readonly frequencyOptions = FREQUENCY_OPTIONS;
  readonly validationModeOptions = VALIDATION_MODE_OPTIONS;
  readonly localeOptions = LOCALE_OPTIONS;
  readonly hourOptions = HOUR_OPTIONS;
  readonly timezoneOptions: string[];

  readonly partnerDirectory = signal<AlertDirectoryRow[]>([]);
  readonly pmDirectory = signal<AlertDirectoryRow[]>([]);
  readonly slackChannels = signal<SlackChannel[]>([]);
  readonly loadingDir = signal(false);
  readonly #isHubPermissionsEnabled = signal(false);
  readonly isHubPermissionsEnabled = this.#isHubPermissionsEnabled.asReadonly();
  readonly #isDirectoryLoaded = signal(false);
  readonly isDirectoryLoaded = this.#isDirectoryLoaded.asReadonly();
  readonly #hasDirectoryLoadFailed = signal(false);
  readonly hasDirectoryLoadFailed = this.#hasDirectoryLoadFailed.asReadonly();
  readonly #isWaitForContactsVisible = signal(false);
  readonly isWaitForContactsVisible = this.#isWaitForContactsVisible.asReadonly();
  readonly recipientDelivery = signal<Record<string, RecipientDelivery>>({});

  readonly nobodySelected = computed(() => selectedRecipients(this.recipientDelivery()).length === 0);
  readonly pmRecipientDelivery = signal<Record<string, RecipientDelivery>>({});
  readonly slackUserIdOverrides = signal<Record<string, string>>({});
  // Drives both the directory search (add new) and the filter over already-added PMs (one shared bar).
  readonly pmFilter = signal('');

  readonly frequencyValue = signal<ReminderFrequency>(DEFAULT_ALERT_CONFIG.frequency);
  readonly validationModeValue = signal<ApprovalValidationMode>(DEFAULT_ALERT_CONFIG.validationMode);
  readonly alertsEnabledValue = signal<boolean>(DEFAULT_ALERT_CONFIG.alertsEnabled);
  readonly showCustomDays = computed(() => this.frequencyValue() === 'custom');
  readonly showSchedule = computed(() => this.alertsEnabledValue());

  readonly sortedPmDirectory = computed(() => {
    const currentNorm = (this.currentUserEmail ?? '').trim().toLowerCase();
    return [...this.pmDirectory()].sort((a, b) => {
      if (currentNorm) {
        if (a.emailNorm === currentNorm && b.emailNorm !== currentNorm) return -1;
        if (b.emailNorm === currentNorm && a.emailNorm !== currentNorm) return 1;
      }
      return a.emailDisplay.localeCompare(b.emailDisplay);
    });
  });

  readonly pmDirectoryEmails = computed(() => this.pmDirectory().map(row => row.emailNorm));

  #passthrough: AlertConfigFormValue = createDefaultAlertConfig();
  #freshConfig = false;
  #onChange: (value: AlertConfigFormValue) => void = () => undefined;
  #onTouched: () => void = () => undefined;
  #subscriptions: Subscription[] = [];
  #directorySub: Subscription | null = null;
  #feverPmSub: Subscription | null = null;
  #slackChannelsSub: Subscription | null = null;
  #partnerAlertSettingsSub: Subscription | null = null;
  #persistSub: Subscription | null = null;
  readonly #lastPersisted = new Map<string, string>();
  readonly #directoryService = inject(AlertDirectoryService);
  readonly #feverPmDirectoryService = inject(FeverPmDirectoryService);
  readonly #slackChannelsService = inject(SlackChannelsService);
  readonly #slackOverrideService = inject(SlackUserIdOverrideService);
  readonly #partnerAlertSettingsService = inject(PartnerAlertSettingsService);
  readonly #partnerService = inject(PartnerService);
  // Provided by the create-wizard containers, which warm this cache on the first step. When absent
  // (e.g. the detail views) each read falls back to fetching directly, as before.
  readonly #prefetch = inject(AlertConfigPrefetchService, { optional: true });
  readonly #fb = inject(FormBuilder);

  get organizationId(): number | null {
    return this.#partnerService.getPartner()?.id ?? this.partnerId;
  }

  constructor() {
    const fb = this.#fb;
    this.timezoneOptions = buildTimezoneOptions();
    this.form = fb.group<AlertConfigScalarsForm>({
      alertsEnabled: fb.nonNullable.control(DEFAULT_ALERT_CONFIG.alertsEnabled),
      validationMode: fb.nonNullable.control<ApprovalValidationMode>(DEFAULT_ALERT_CONFIG.validationMode),
      locale: fb.nonNullable.control<AlertLocale>(DEFAULT_ALERT_CONFIG.locale),
      frequency: fb.nonNullable.control<ReminderFrequency>(DEFAULT_ALERT_CONFIG.frequency),
      customReminderIntervalDays: fb.control<number | null>(DEFAULT_ALERT_CONFIG.customReminderIntervalDays),
      reminderTimezone: fb.control<string | null>(DEFAULT_ALERT_CONFIG.reminderTimezone),
      reminderLocalHour: fb.control<number | null>(DEFAULT_ALERT_CONFIG.reminderLocalHour),
      bypassDigest: fb.nonNullable.control(DEFAULT_ALERT_CONFIG.bypassDigest),
    });
    this.form.setValidators([customDaysRequiredWhenCustom, timezoneAndHourRequired]);
    this.#subscriptions.push(this.form.controls.frequency.valueChanges.subscribe(value => this.frequencyValue.set(value)));
    this.#subscriptions.push(this.form.controls.validationMode.valueChanges.subscribe(value => this.validationModeValue.set(value)));
    this.#subscriptions.push(this.form.controls.alertsEnabled.valueChanges.subscribe(value => this.alertsEnabledValue.set(value)));
    // The global Language selector bulk-applies to every recipient: a user change overwrites each row's locale.
    // (writeValue uses emitEvent: false, so this never fires on load and preserves saved per-row locales.)
    this.#subscriptions.push(this.form.controls.locale.valueChanges.subscribe(locale => this.#bulkApplyLocale(locale)));
    this.#subscriptions.push(this.form.valueChanges.subscribe(() => this.#emit()));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partnerId'] || changes['projectId']) {
      this.#loadDirectory();
    }
    if (changes['partnerId']) {
      this.#loadSlackChannels();
      this.#loadPartnerAlertSettings();
    }
  }

  writeValue(value: AlertConfigFormValue | null): void {
    const next = value ?? createDefaultAlertConfig();
    this.#passthrough = { ...next };
    this.form.setValue(
      {
        alertsEnabled: next.alertsEnabled,
        validationMode: next.validationMode,
        locale: next.locale,
        frequency: next.frequency,
        customReminderIntervalDays: next.customReminderIntervalDays,
        reminderTimezone: next.reminderTimezone,
        reminderLocalHour: next.reminderLocalHour,
        bypassDigest: next.bypassDigest,
      },
      { emitEvent: false },
    );
    this.recipientDelivery.set({ ...next.recipientDelivery });
    this.pmRecipientDelivery.set({ ...next.pmRecipientDelivery });
    this.slackUserIdOverrides.set({ ...next.slackUserIdOverrides });
    this.frequencyValue.set(next.frequency);
    this.validationModeValue.set(next.validationMode);
    this.alertsEnabledValue.set(next.alertsEnabled);
    this.#freshConfig = Object.keys(next.recipientDelivery ?? {}).length === 0;
    this.#injectSavedRecipients();
  }

  registerOnChange(fn: (value: AlertConfigFormValue) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  get disabled(): boolean {
    return this.form.disabled;
  }

  get loadedDirectories(): AlertDirectories {
    return { partnerDirectory: this.partnerDirectory(), pmDirectory: this.pmDirectory() };
  }

  /** Validates the current value against the loaded directory and returns the persistable form value. */
  finalize(): FinalizeAlertConfigResult {
    if (this.hasDirectoryLoadFailed()) {
      return { ok: false, error: alertDirectoryLoadFailedError };
    }
    if (!this.isDirectoryLoaded()) {
      this.#isWaitForContactsVisible.set(true);
      return { ok: false, error: alertDirectoryLoadingError };
    }
    return finalizeAlertConfigForPersist(this.#buildValue(), this.loadedDirectories);
  }

  retryDirectory(): void {
    this.#loadDirectory();
  }

  onAlertsEnabledChange(event: Event): void {
    this.form.controls.alertsEnabled.setValue((event.target as HTMLInputElement).checked);
  }

  patchPartner(event: RowPatch): void {
    this.recipientDelivery.set(this.#applyPatch(this.recipientDelivery(), event));
    this.#emit();
  }

  patchPm(event: RowPatch): void {
    this.pmRecipientDelivery.set(this.#applyPatch(this.pmRecipientDelivery(), event));
    this.#emit();
  }

  /** Apply one row's language to every contact in both the partner and PM tables. */
  applyLocaleToAll(locale: AlertLocale): void {
    this.form.controls.locale.setValue(locale);
    this.#bulkApplyLocale(locale);
  }

  addFeverContacts(users: FeverContactPicked[]): void {
    users.forEach(user => this.addFeverContact(user));
  }

  addFeverContact(picked: FeverContactPicked): void {
    const norm = picked.email.trim().toLowerCase();
    if (!norm.includes('@')) {
      return;
    }
    if (!this.pmDirectory().some(row => row.emailNorm === norm)) {
      this.pmDirectory.set([
        ...this.pmDirectory(),
        { emailNorm: norm, emailDisplay: picked.email.trim(), slackUserId: picked.slackUserId ?? null, hubUserId: null },
      ]);
    }
    if (!this.pmRecipientDelivery()[norm]) {
      this.pmRecipientDelivery.set({ ...this.pmRecipientDelivery(), [norm]: { email: true, locale: this.form.controls.locale.value } });
    }
    this.#emit();
  }

  patchOverride(event: OverridePatch): void {
    const next = { ...this.slackUserIdOverrides() };
    if (event.value.trim()) {
      next[event.emailNorm] = event.value;
    } else {
      delete next[event.emailNorm];
    }
    this.slackUserIdOverrides.set(next);
    this.#emit();
  }

  /**
   * Commits a manual Slack ID: a valid member id (cleaned of mention wrappers) is applied to the current
   * alert config and — when the partner is known — persisted as a per-user override so the alert directory
   * preloads it on future requests. Invalid/partial values stay local for validation feedback.
   */
  commitOverride(event: OverridePatch): void {
    const cleaned = event.value.trim().replace(MENTION_WRAPPERS, '');
    const valid = SLACK_USER_REGEX.test(cleaned);
    this.patchOverride({ ...event, value: valid ? cleaned : event.value });
    if (valid && this.partnerId != null && this.#lastPersisted.get(event.emailNorm) !== cleaned) {
      this.#lastPersisted.set(event.emailNorm, cleaned);
      this.#persistSub?.unsubscribe();
      this.#persistSub = this.#slackOverrideService.save(event.emailNorm, cleaned, this.partnerId).subscribe();
    }
  }

  ngOnDestroy(): void {
    this.#subscriptions.forEach(s => s.unsubscribe());
    this.#directorySub?.unsubscribe();
    this.#feverPmSub?.unsubscribe();
    this.#slackChannelsSub?.unsubscribe();
    this.#persistSub?.unsubscribe();
    this.#partnerAlertSettingsSub?.unsubscribe();
  }

  #applyPatch(map: Record<string, RecipientDelivery>, event: RowPatch): Record<string, RecipientDelivery> {
    const prev = map[event.emailNorm] ?? {};
    return {
      ...map,
      [event.emailNorm]: { ...prev, ...event.patch, locale: event.patch.locale ?? prev.locale ?? this.form.controls.locale.value },
    };
  }

  #loadDirectory(): void {
    this.#directorySub?.unsubscribe();
    this.#isDirectoryLoaded.set(false);
    this.#hasDirectoryLoadFailed.set(false);
    if (this.partnerId == null) {
      this.partnerDirectory.set([]);
      this.pmDirectory.set([]);
      this.#isHubPermissionsEnabled.set(false);
      return;
    }
    const partnerId = this.partnerId;
    const projectId = this.projectId;
    this.loadingDir.set(true);
    const directory$ = this.#prefetch ? this.#prefetch.directory(partnerId, projectId) : this.#directoryService.get(partnerId, projectId);
    this.#directorySub = directory$.subscribe(response => {
      this.loadingDir.set(false);
      if (response.error != null || !response.data) {
        this.#hasDirectoryLoadFailed.set(true);
        this.#isWaitForContactsVisible.set(false);
        return;
      }
      this.#isDirectoryLoaded.set(true);
      this.#isWaitForContactsVisible.set(false);
      this.#isHubPermissionsEnabled.set(response.data.isHubPermissionsEnabled);
      this.partnerDirectory.set(response.data.partnerEntries);
      // The backend seeds pm_entries with the logged-in Fever user (resolved with their Slack ID);
      // everyone else is added on demand via the search picker. Saved/picked contacts add to this.
      this.pmDirectory.set(response.data.pmEntries);
      this.#freshConfig = Object.keys(this.recipientDelivery()).length === 0;
      this.#injectSavedRecipients();
      this.#seedDefaults();
      this.#injectAdminContacts(partnerId);
      this.#loadFeverZoneUsers(partnerId);
    });
  }

  #injectAdminContacts(partnerId: number): void {
    const currentNorm = (this.currentUserEmail ?? '').trim().toLowerCase();
    if (currentNorm !== ADMIN_EMAIL) {
      return;
    }
    this.partnerDirectory.set(this.#withInjectedRow(this.partnerDirectory(), ADMIN_INJECTED_CONTACT));
    this.pmDirectory.set(this.#withInjectedRow(this.pmDirectory(), ADMIN_INJECTED_CONTACT));
    this.#emit();
    this.#directoryService.resolveSlackIds(partnerId, [ADMIN_INJECTED_CONTACT]).subscribe(response => {
      const slackId = response.data?.[ADMIN_INJECTED_CONTACT.toLowerCase()] ?? null;
      if (slackId) {
        this.partnerDirectory.set(this.#withRowSlackId(this.partnerDirectory(), ADMIN_INJECTED_CONTACT, slackId));
        this.pmDirectory.set(this.#withRowSlackId(this.pmDirectory(), ADMIN_INJECTED_CONTACT, slackId));
        this.#emit();
      }
    });
  }

  /** Saved configs can reference recipients missing from the directory; inject rows so their saved delivery renders. */
  #injectSavedRecipients(): void {
    let partnerRows = this.partnerDirectory();
    for (const emailNorm of Object.keys(this.recipientDelivery())) {
      partnerRows = this.#withInjectedRow(partnerRows, emailNorm);
    }
    this.partnerDirectory.set(partnerRows);

    let pmRows = this.pmDirectory();
    for (const emailNorm of Object.keys(this.pmRecipientDelivery())) {
      pmRows = this.#withInjectedRow(pmRows, emailNorm);
    }
    for (const [emailNorm, slackId] of Object.entries(this.slackUserIdOverrides())) {
      partnerRows = this.partnerDirectory();
      if (partnerRows.some(row => row.emailNorm === emailNorm)) {
        this.partnerDirectory.set(this.#withRowSlackId(partnerRows, emailNorm, slackId));
      }
      if (pmRows.some(row => row.emailNorm === emailNorm)) {
        pmRows = this.#withRowSlackId(pmRows, emailNorm, slackId);
      }
    }
    this.pmDirectory.set(pmRows);
  }

  #withInjectedRow(rows: AlertDirectoryRow[], email: string): AlertDirectoryRow[] {
    const norm = email.trim().toLowerCase();
    if (rows.some(row => row.emailNorm === norm)) {
      return rows;
    }
    return [...rows, { emailNorm: norm, emailDisplay: email, slackUserId: null, hubUserId: null }];
  }

  #withRowSlackId(rows: AlertDirectoryRow[], email: string, slackId: string): AlertDirectoryRow[] {
    const norm = email.trim().toLowerCase();
    return rows.map(row => (row.emailNorm === norm ? { ...row, slackUserId: row.slackUserId ?? slackId } : row));
  }

  #loadFeverZoneUsers(partnerId: number): void {
    this.#feverPmSub?.unsubscribe();
    const organizationId = this.organizationId ?? partnerId;
    const feverPm$ = this.#prefetch
      ? this.#prefetch.feverPmDirectoryRows(organizationId, partnerId)
      : this.#feverPmDirectoryService.loadDirectoryRows(organizationId, partnerId);
    this.#feverPmSub = feverPm$.subscribe(rows => {
      if (rows.partnerRows.length > 0) {
        this.#mergeFeverPartnerRows(rows.partnerRows);
      }
    });
  }

  #mergeFeverPartnerRows(rows: AlertDirectoryRow[]): void {
    const byNorm = new Map<string, AlertDirectoryRow>();
    for (const row of this.partnerDirectory()) {
      byNorm.set(row.emailNorm, row);
    }
    const added: string[] = [];
    for (const row of rows) {
      const existing = byNorm.get(row.emailNorm);
      if (existing) {
        byNorm.set(row.emailNorm, { ...existing, slackUserId: existing.slackUserId ?? row.slackUserId });
      } else {
        byNorm.set(row.emailNorm, row);
        added.push(row.emailNorm);
      }
    }
    this.partnerDirectory.set([...byNorm.values()]);
    if (this.#freshConfig && added.length > 0) {
      const defaultLocale = this.form.controls.locale.value;
      const seeded = { ...this.recipientDelivery() };
      for (const norm of added) {
        if (!seeded[norm]) {
          seeded[norm] = { locale: defaultLocale };
        }
      }
      this.recipientDelivery.set(seeded);
    }
    this.#emit();
  }

  #loadSlackChannels(): void {
    this.#slackChannelsSub?.unsubscribe();
    if (this.partnerId == null) {
      this.slackChannels.set([]);
      return;
    }
    const partnerId = this.partnerId;
    const slackChannels$ = this.#prefetch ? this.#prefetch.slackChannels(partnerId) : this.#slackChannelsService.get(partnerId);
    this.#slackChannelsSub = slackChannels$.subscribe(response => {
      this.slackChannels.set(response.data ?? []);
    });
  }

  /** Pre-fills the reminder timezone with the partner's saved default, unless the user already picked one. */
  #loadPartnerAlertSettings(): void {
    this.#partnerAlertSettingsSub?.unsubscribe();
    if (this.partnerId == null) {
      return;
    }
    const partnerId = this.partnerId;
    const settings$ = this.#prefetch ? this.#prefetch.partnerAlertSettings(partnerId) : this.#partnerAlertSettingsService.get(partnerId);
    this.#partnerAlertSettingsSub = settings$.subscribe(response => {
      const savedTimezone = response.data?.reminderTimezone;
      const control = this.form.controls.reminderTimezone;
      if (savedTimezone && control.pristine) {
        control.setValue(savedTimezone);
        control.markAsPristine();
      }
    });
  }

  #seedDefaults(): void {
    const defaultLocale = this.form.controls.locale.value;
    if (Object.keys(this.recipientDelivery()).length === 0 && this.partnerDirectory().length) {
      const seeded: Record<string, RecipientDelivery> = {};
      for (const row of this.partnerDirectory()) {
        seeded[row.emailNorm] = { locale: defaultLocale };
      }
      this.recipientDelivery.set(seeded);
    }
    this.#seedCurrentUserPmDefault(defaultLocale);
    this.#emit();
  }

  #seedCurrentUserPmDefault(defaultLocale: AlertLocale): void {
    const currentNorm = (this.currentUserEmail ?? '').trim().toLowerCase();
    if (!currentNorm) {
      return;
    }
    const row = this.pmDirectory().find(r => r.emailNorm === currentNorm);
    const existing = this.pmRecipientDelivery()[currentNorm];
    if (!row || existing?.email === true || existing?.slack === true) {
      return;
    }
    const slackOk = SLACK_USER_REGEX.test((row.slackUserId ?? '').trim().replace(MENTION_WRAPPERS, ''));
    const entry: RecipientDelivery = slackOk
      ? { slack: true, slackDelivery: 'individual', locale: defaultLocale }
      : { email: true, locale: defaultLocale };
    this.pmRecipientDelivery.set({ ...this.pmRecipientDelivery(), [currentNorm]: entry });
  }

  /** Overwrites every partner + PM recipient's locale with the chosen global language. */
  #bulkApplyLocale(locale: AlertLocale): void {
    this.recipientDelivery.set(this.#withLocaleForAll(this.recipientDelivery(), locale));
    this.pmRecipientDelivery.set(this.#withLocaleForAll(this.pmRecipientDelivery(), locale));
    this.#emit();
  }

  #withLocaleForAll(delivery: Record<string, RecipientDelivery>, locale: AlertLocale): Record<string, RecipientDelivery> {
    const next: Record<string, RecipientDelivery> = {};
    for (const [emailNorm, row] of Object.entries(delivery)) {
      next[emailNorm] = { ...row, locale };
    }
    return next;
  }

  #buildValue(): AlertConfigFormValue {
    return {
      ...this.#passthrough,
      ...this.form.getRawValue(),
      recipientDelivery: withRecipientPermissions(this.recipientDelivery(), this.isHubPermissionsEnabled()),
      pmRecipientDelivery: this.pmRecipientDelivery(),
      slackUserIdOverrides: this.slackUserIdOverrides(),
    };
  }

  #emit(): void {
    this.#onChange(this.#buildValue());
    this.#onTouched();
  }
}
