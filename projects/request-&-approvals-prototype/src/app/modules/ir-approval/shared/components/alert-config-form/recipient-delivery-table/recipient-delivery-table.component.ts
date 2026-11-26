import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, input, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AlertDirectoryRow } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';
import { SlackChannel } from '@fz-original/app/shared/services/slack-channels/slack-channels.model';
import { IgntButtonComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

import { AlertLocale, hasRecipientPermission, RecipientDelivery, SlackDelivery } from '../../../models/alert-config.model';
import { OverridePatch, RowPatch } from '../../../models/recipient-delivery-table.model';
import { slackMemberIdForAlertDirectoryRow } from '../../../utils/alert-config-finalize.util';
import { isFeverEmail } from '../../../utils/fever-email.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntInputFieldComponent,
    IgntRadioComponent,
    NgSelectModule,
    TranslateModule,
    UpperCasePipe,
  ],
  selector: 'app-recipient-delivery-table',
  standalone: true,
  styleUrl: './recipient-delivery-table.component.scss',
  templateUrl: './recipient-delivery-table.component.html',
})
export class RecipientDeliveryTableComponent {
  readonly delivery = input.required<Record<string, RecipientDelivery>>();
  readonly slackChannels = input<SlackChannel[]>([]);
  readonly rows = input.required<AlertDirectoryRow[]>();
  @Input() overrides: Record<string, string> = {};
  @Input() defaultLocale: AlertLocale = 'en';
  @Input() localeOptions: AlertLocale[] = ['en', 'es', 'fr', 'it', 'de'];
  @Input() disabled = false;
  /** Fallback checked state when a recipient has no explicit `email` flag; both tables default it OFF. */
  @Input() emailDefaultsOn = false;
  @Input() idPrefix = 'row';
  /** Opt-in: render an email search box and cap the table height with vertical scroll. */
  @Input() showFilter = false;
  /** Filter term driven from outside (e.g. the shared PM search bar). Applies even when showFilter is off. */
  @Input() externalFilter = '';
  readonly isPermissionVisible = input(false);

  @Output() rowPatch = new EventEmitter<RowPatch>();
  @Output() overridePatch = new EventEmitter<OverridePatch>();
  @Output() overrideCommit = new EventEmitter<OverridePatch>();
  /** Apply this row's language to every contact (both partner and PM tables). */
  @Output() applyLocaleToAll = new EventEmitter<AlertLocale>();

  readonly filterQuery = signal('');
  readonly addTypedChannel = (term: string): SlackChannel => {
    const id = this.#resolveChannelId(term);
    return this.slackChannels().find(channel => channel.id === id) ?? { id, name: id };
  };
  readonly matchesChannel = (term: string, channel: SlackChannel): boolean => {
    const query = term.trim().replace(/^#/, '').toLowerCase();
    return channel.name.toLowerCase().includes(query) || channel.id.toLowerCase().includes(query);
  };

  readonly isPermissionEligibleByEmail = computed<Record<string, boolean>>(() =>
    Object.fromEntries(this.rows().map(row => [row.emailNorm, !isFeverEmail(row.emailNorm)])),
  );
  readonly isPermissionOnByEmail = computed<Record<string, boolean>>(() => {
    const delivery = this.delivery();
    return Object.fromEntries(this.rows().map(row => [row.emailNorm, hasRecipientPermission(delivery[row.emailNorm])]));
  });

  readonly #unknownChannelOptions = computed(() => {
    const channels = this.slackChannels();
    const options = new Map<string, SlackChannel[]>();
    for (const { slackChannelId } of Object.values(this.delivery())) {
      if (slackChannelId && !options.has(slackChannelId) && !channels.some(channel => channel.id === slackChannelId)) {
        options.set(slackChannelId, [...channels, { id: slackChannelId, name: slackChannelId }]);
      }
    }
    return options;
  });

  onFilterInput(value: string): void {
    this.filterQuery.set(value);
  }

  /** Rows after applying the email filter; identity when no filter term is active. */
  visibleRows(): AlertDirectoryRow[] {
    const internal = this.showFilter ? this.filterQuery() : '';
    const query = (this.externalFilter || internal).trim().toLowerCase();
    if (!query) {
      return this.rows();
    }
    return this.rows().filter(row => row.emailDisplay.toLowerCase().includes(query) || row.emailNorm.includes(query));
  }

  emailOn(row: AlertDirectoryRow): boolean {
    const entry = this.delivery()[row.emailNorm];
    if (!entry || entry.email === undefined) {
      return this.emailDefaultsOn;
    }
    return entry.email === true;
  }

  slackOn(row: AlertDirectoryRow): boolean {
    return this.delivery()[row.emailNorm]?.slack === true;
  }

  slackMode(row: AlertDirectoryRow): SlackDelivery {
    return this.delivery()[row.emailNorm]?.slackDelivery === 'channel' ? 'channel' : 'individual';
  }

  localeFor(row: AlertDirectoryRow): AlertLocale {
    return this.delivery()[row.emailNorm]?.locale ?? this.defaultLocale;
  }

  channelIdFor(row: AlertDirectoryRow): string {
    return this.delivery()[row.emailNorm]?.slackChannelId ?? '';
  }

  channelOptionsFor(row: AlertDirectoryRow): SlackChannel[] {
    return this.#unknownChannelOptions().get(this.channelIdFor(row)) ?? this.slackChannels();
  }

  channelOptionLabel(channel: SlackChannel): string {
    return this.slackChannels().some(known => known.id === channel.id) ? `#${channel.name}` : channel.name;
  }

  overrideFor(row: AlertDirectoryRow): string {
    return this.overrides[row.emailNorm] ?? row.slackUserId ?? '';
  }

  /**
   * Shown only when Slack delivery still needs a member ID. When the directory already defines a Slack ID
   * for the contact, the field is hidden so the resolved ID can't be changed directly. Otherwise it is shown
   * for individual delivery (so the user can provide one) or whenever no member ID resolves.
   */
  needsMemberIdOverride(row: AlertDirectoryRow): boolean {
    if (!this.slackOn(row)) {
      return false;
    }
    if (slackMemberIdForAlertDirectoryRow(row, undefined) !== null) {
      return false;
    }
    return this.slackMode(row) === 'individual' || slackMemberIdForAlertDirectoryRow(row, this.overrides) === null;
  }

  languageDisabled(row: AlertDirectoryRow): boolean {
    return this.disabled || (!this.emailOn(row) && !this.slackOn(row));
  }

  onEmailToggle(row: AlertDirectoryRow, checked: boolean): void {
    const patch: Partial<RecipientDelivery> = { email: checked, ...this.#permissionAfterAlertToggle(row, checked) };
    if (checked) {
      patch.locale = this.localeFor(row);
    }
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch });
  }

  onSlackToggle(row: AlertDirectoryRow, checked: boolean): void {
    const patch: Partial<RecipientDelivery> = {
      slack: checked,
      slackDelivery: checked ? 'individual' : undefined,
      slackChannelId: undefined,
      ...this.#permissionAfterAlertToggle(row, checked),
    };
    if (checked) {
      patch.locale = this.localeFor(row);
    }
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch });
  }

  onPermissionToggle(row: AlertDirectoryRow, checked: boolean): void {
    const patch: Partial<RecipientDelivery> = checked
      ? { permission: true }
      : { permission: false, email: false, slack: false, slackDelivery: undefined, slackChannelId: undefined };
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch });
  }

  onModeIndividual(row: AlertDirectoryRow): void {
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch: { slackDelivery: 'individual', slackChannelId: undefined } });
  }

  onModeChannel(row: AlertDirectoryRow): void {
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch: { slackDelivery: 'channel' } });
  }

  onChannelIdInput(row: AlertDirectoryRow, value: string): void {
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch: { slackChannelId: value.trim() } });
  }

  onChannelNameInput(row: AlertDirectoryRow, value: string): void {
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch: { slackChannelId: this.#resolveChannelId(value) } });
  }

  onChannelSelected(row: AlertDirectoryRow, channelId: string | null): void {
    this.onChannelNameInput(row, channelId ?? '');
  }

  onLocaleChange(row: AlertDirectoryRow, locale: string): void {
    this.rowPatch.emit({ emailNorm: row.emailNorm, patch: { locale: locale as AlertLocale } });
  }

  applyToAll(row: AlertDirectoryRow): void {
    this.applyLocaleToAll.emit(this.localeFor(row));
  }

  onOverrideInput(row: AlertDirectoryRow, value: string): void {
    this.overridePatch.emit({ emailNorm: row.emailNorm, value });
  }

  onOverrideBlur(row: AlertDirectoryRow): void {
    this.onOverrideCommit(row, this.overrideFor(row));
  }

  onOverrideCommit(row: AlertDirectoryRow, value: string): void {
    this.overrideCommit.emit({ emailNorm: row.emailNorm, value });
  }

  trackByEmailNorm(_index: number, row: AlertDirectoryRow): string {
    return row.emailNorm;
  }

  #permissionAfterAlertToggle(row: AlertDirectoryRow, checked: boolean): Partial<RecipientDelivery> {
    if (!this.isPermissionVisible() || !this.isPermissionEligibleByEmail()[row.emailNorm]) {
      return {};
    }
    return { permission: checked || this.isPermissionOnByEmail()[row.emailNorm] };
  }

  #resolveChannelId(value: string): string {
    const trimmed = value.trim().replace(/^#/, '');
    const byName = this.slackChannels().find(channel => channel.name.toLowerCase() === trimmed.toLowerCase());
    const byId = this.slackChannels().find(channel => channel.id === trimmed);
    return byName?.id ?? byId?.id ?? trimmed;
  }
}
