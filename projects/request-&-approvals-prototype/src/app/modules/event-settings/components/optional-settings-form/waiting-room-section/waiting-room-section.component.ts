import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { map, switchMap } from 'rxjs/operators';

import { WaitingRoomSectionFacade } from './facades/waiting-room-section/waiting-room-section.facade';
import { FieldSelectComponent } from './field-select/field-select.component';
import { isChannelSelected } from './is-channel-selected';
import { WaitingRoomDeleteConfirmDialogComponent } from './waiting-room-delete-confirm-dialog/waiting-room-delete-confirm-dialog.component';
import { WaitingRoomFormComponent } from './waiting-room-form/waiting-room-form.component';
import { waitingRoomFormField } from './waiting-room-form/waiting-room-form.constants';
import { deleteConfirmI18n, feverMarketplaceOption, sectionI18n } from './waiting-room-section.constants';
import type { WaitingRoomFormGroup } from './waiting-room-section.types';
import { disableFieldsWhenWrExists$, hasWaitingRoomId, watchControlValue$ } from './waiting-room-section.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FieldSelectComponent,
    IgntIconComponent,
    IgntToggleComponent,
    IgntWrapperCardComponent,
    ReactiveFormsModule,
    SharedComponentsModule,
    TranslateModule,
    WaitingRoomFormComponent,
  ],
  providers: [WaitingRoomSectionFacade],
  selector: 'app-waiting-room-section',
  standalone: true,
  styleUrls: ['./waiting-room-section.component.scss'],
  templateUrl: './waiting-room-section.component.html',
})
export class WaitingRoomSectionComponent implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #igntDialogService = inject(IgntDialogService);
  readonly #facade = inject(WaitingRoomSectionFacade);

  readonly formField = waitingRoomFormField;

  readonly i18n = sectionI18n;

  readonly canEditPlan = input<boolean>(true);

  waitingRoomForm = input.required<WaitingRoomFormGroup>();

  readonly #form$ = toObservable(this.waitingRoomForm);

  readonly channelOptions = toSignal(this.#facade.getChannelOptions$(), {
    initialValue: [feverMarketplaceOption],
  });

  readonly isToggleOn = signal(false);

  #syncToggleFromEnabledControl(): void {
    this.#form$
      .pipe(
        switchMap(({ controls: { enabled } }) => watchControlValue$(enabled)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((value: boolean) => {
        this.isToggleOn.set(value);
      });
  }

  readonly hasChannelSelected = toSignal(
    this.#form$.pipe(switchMap(({ controls: { channelId } }) => watchControlValue$(channelId).pipe(map(isChannelSelected)))),
    { initialValue: false },
  );

  readonly isToggleDisabled = signal(true);
  readonly planMaxOutflow = signal<number | null>(null);
  readonly planType = signal<string | null>(null);
  readonly showLoader = signal(false);

  ngOnInit(): void {
    this.#syncToggleFromEnabledControl();
    this.#facade.syncWaitingRoomValidators(this.#form$, this.#destroyRef);
    this.#form$
      .pipe(
        switchMap(form => disableFieldsWhenWrExists$(form)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
    this.#setupWaitingRoomLoad();
  }

  onToggleChange(event: Event): void {
    if (!this.canEditPlan()) {
      return;
    }
    const form = this.waitingRoomForm();
    const { enabled, waitingRoomId } = form.controls;

    const checked = (event.target as HTMLInputElement).checked;

    if (!checked && hasWaitingRoomId(waitingRoomId.value)) {
      this.#confirmDeleteWaitingRoom(form);
      return;
    }

    enabled.setValue(checked);
    form.markAsDirty();
  }

  #confirmDeleteWaitingRoom(form: WaitingRoomFormGroup): void {
    const { enabled } = form.controls;

    this.isToggleOn.set(false);

    const dialogRef = this.#igntDialogService.openModal<boolean>(WaitingRoomDeleteConfirmDialogComponent, {
      data: deleteConfirmI18n,
      disableCloseShortcuts: true,
      size: 'sm',
    });

    dialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((confirmed: boolean | undefined) => {
      if (confirmed === true) {
        enabled.setValue(false);
        form.markAsDirty();
      } else {
        this.isToggleOn.set(true);
      }
    });
  }

  #setupWaitingRoomLoad(): void {
    const setShowLoader = (show: boolean): void => {
      this.showLoader.set(show);
    };
    const setToggleDisabled = (disabled: boolean): void => {
      this.isToggleDisabled.set(disabled);
    };

    const setPlanInfo = (planType: string | null, planMaxOutflow: number | null): void => {
      this.planType.set(planType);
      this.planMaxOutflow.set(planMaxOutflow);
    };

    this.#facade.runLoadPipeline(this.#form$, this.#destroyRef, {
      setPlanInfo,
      setShowLoader,
      setToggleDisabled,
    });
  }
}
