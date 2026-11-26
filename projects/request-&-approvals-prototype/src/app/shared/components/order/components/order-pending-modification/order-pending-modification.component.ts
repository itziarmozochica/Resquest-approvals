import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { PermissionBaseModule } from '@fz-original/app/shared/directives/permission-based/permission-base.module';
import { type OrderPendingModification } from '@fz-original/app/shared/models/order-pending-modification/order-pending-modification.model';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntAlertComponent, IgntButtonComponent, IgntTooltipDirective } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { orderPendingModificationI18n } from '../../models/order-pending-modification-i18n.model';
import { type OrderPendingModificationReservationLink } from '../../models/order-pending-modification-reservation-link.model';
import { OrderPendingModificationFacade } from '../../services/order-pending-modification.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, IgntTooltipDirective, PermissionBaseModule, PipesModule, RouterLink, TranslateModule],
  selector: 'app-order-pending-modification',
  styleUrl: './order-pending-modification.component.scss',
  templateUrl: './order-pending-modification.component.html',
})
export class OrderPendingModificationComponent {
  static readonly cancelPermissions: readonly string[] = [Permissions.CAN_CANCEL_RESERVATION, Permissions.CAN_CANCEL_MY_RESERVATION];
  static readonly maxTimeoutMs = 2_147_483_647;

  readonly #destroyRef = inject(DestroyRef);
  readonly #facade = inject(OrderPendingModificationFacade);
  readonly #userService = inject(UserService);
  readonly #expiryTick = signal(0);

  readonly locale = input<string | undefined>(undefined);
  readonly pendingModification = input.required<OrderPendingModification>();
  readonly timezone = input<string | undefined>(undefined);

  readonly refreshRequested = output<void>();

  protected readonly cancelPermissions = OrderPendingModificationComponent.cancelPermissions;
  protected readonly i18n = orderPendingModificationI18n;

  protected readonly isBusy: Signal<boolean> = computed(() => this.#facade.busyReservationId() !== null);
  protected readonly isExpired: Signal<boolean> = computed(() => {
    this.#expiryTick();
    return this.#hasExpired();
  });
  protected readonly isShareDisabled: Signal<boolean> = computed(() => this.isBusy() || this.isExpired());
  protected readonly shareHint: Signal<string> = computed(() => (this.isExpired() ? this.i18n.expiredHint : this.i18n.busyHint));
  protected readonly reservationLink: Signal<OrderPendingModificationReservationLink | null> = computed(() => {
    const { planId, reservationId } = this.pendingModification();
    if (planId === null) {
      return null;
    }
    const queryParams = { planId };
    if (this.#userService.hasPermission(Permissions.CAN_VIEW_RESERVATIONS)) {
      return { commands: ['/reservations/list', reservationId], queryParams };
    }
    if (this.#userService.hasPermission(Permissions.CAN_VIEW_MY_RESERVATIONS)) {
      return { commands: ['/reservations/user-list', reservationId], queryParams };
    }
    return null;
  });
  protected readonly isReleasing: Signal<boolean> = computed(() =>
    this.#facade.cancelledReservationIds().has(this.pendingModification().reservationId),
  );

  constructor() {
    effect(onCleanup => {
      this.#expiryTick();
      const msUntilExpiry = Date.parse(this.pendingModification().expiresAt) - Date.now();
      if (msUntilExpiry <= 0) {
        return;
      }
      const timeoutId = setTimeout(
        () => this.#expiryTick.update(tick => tick + 1),
        Math.min(msUntilExpiry, OrderPendingModificationComponent.maxTimeoutMs),
      );
      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  cancelPaymentLink(): void {
    this.#facade
      .cancelPaymentLink(this.pendingModification())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isCancelled: boolean) => {
        if (isCancelled) {
          this.refreshRequested.emit();
        }
      });
  }

  refreshOrder(): void {
    this.refreshRequested.emit();
  }

  sharePaymentLink(): void {
    if (this.#hasExpired()) {
      this.#expiryTick.update(tick => tick + 1);
      return;
    }
    this.#facade.sharePaymentLink(this.pendingModification()).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #hasExpired(): boolean {
    return Date.parse(this.pendingModification().expiresAt) <= Date.now();
  }
}
