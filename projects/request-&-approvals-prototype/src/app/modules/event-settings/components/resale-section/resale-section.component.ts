import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule } from '@ngx-translate/core';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs';

import { ResaleProvider } from '../../models/resale-section.enum';
import { ResaleSectionConfig } from '../../models/settings-configs.model';

const RESALE_PROVIDER_LABELS: Record<ResaleProvider, string> = {
  [ResaleProvider.Menta]: 'Native',
  [ResaleProvider.Rebel]: 'Rebel',
  [ResaleProvider.TicketSwap]: 'TicketSwap',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntRadioComponent, IgntToggleComponent, TranslateModule],
  selector: 'app-resale-section',
  standalone: true,
  styleUrl: './resale-section.component.scss',
  templateUrl: './resale-section.component.html',
})
export class ResaleSectionComponent {
  readonly resaleFormControl = input.required<FormControl<string | null>>();
  readonly invitationResellingFormControl = input.required<FormControl<boolean>>();
  readonly config = input<ResaleSectionConfig | null>(null);
  readonly canEditPlan = input<boolean>(true);
  readonly onFormDirtyChange = input<((dirty: boolean) => void) | undefined>(undefined);

  protected readonly availableProviders = computed<{ id: ResaleProvider; label: string }[]>(() =>
    (this.config()?.resellingProviders?.allowed ?? []).map(provider => ({ id: provider, label: RESALE_PROVIDER_LABELS[provider] })),
  );

  protected readonly canEdit = computed<boolean>(() => this.canEditPlan() && (this.config()?.resellingProviders?.editable ?? false));

  protected readonly invitationResellingVisible = computed<boolean>(() => this.config()?.allowInvitationReselling?.visible ?? false);

  protected readonly canEditInvitationReselling = computed<boolean>(
    () => this.canEditPlan() && (this.config()?.allowInvitationReselling?.editable ?? false),
  );

  protected readonly enabled = toSignal<boolean, boolean>(
    toObservable(this.resaleFormControl).pipe(
      switchMap(formControl => formControl.valueChanges.pipe(startWith(formControl.value))),
      map(value => value !== null),
      distinctUntilChanged(),
    ),
    { initialValue: false },
  );

  protected onEnabledChange(event: Event): void {
    if (!this.canEdit()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    const defaultProvider = this.availableProviders()[0]?.id ?? null;
    this.resaleFormControl().setValue(enabled ? defaultProvider : null);
    this.resaleFormControl().markAsDirty();
    this.onFormDirtyChange()?.(true);
  }

  protected onInvitationResellingChange(event: Event): void {
    if (!this.canEditInvitationReselling()) {
      return;
    }
    const target = event.target as HTMLInputElement;
    this.invitationResellingFormControl().setValue(target.checked);
    this.invitationResellingFormControl().markAsDirty();
    this.onFormDirtyChange()?.(true);
  }

  protected onProviderSelect(provider: ResaleProvider): void {
    if (!this.canEdit()) {
      return;
    }
    this.resaleFormControl().setValue(provider);
    this.resaleFormControl().markAsDirty();
    this.onFormDirtyChange()?.(true);
  }
}
