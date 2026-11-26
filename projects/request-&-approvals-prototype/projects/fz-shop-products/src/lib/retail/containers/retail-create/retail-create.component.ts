import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { IgntAlertComponent, IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { RetailSetupType } from '../../../core/models/retail-setup-type.model';
import { CreateRetailFormComponent } from '../../components/create-retail-form/create-retail-form.component';
import { RetailSelectionComponent } from '../../components/retail-selection/retail-selection.component';
import type { RetailSetupCreate } from '../../models/retail-setup/retail-setup.model';
import type { RetailViewNavigationState } from '../../models/retail-setup/retail-view-navigation-state.model';
import { RetailSetupStore } from '../../store/retail-setup.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CreateRetailFormComponent, EmptyStateComponent, IgntAlertComponent, IgntIconComponent, TranslateModule],
  selector: 'fz-retail-create',
  styleUrl: './retail-create.component.scss',
  templateUrl: './retail-create.component.html',
})
export class RetailCreateComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #igntDialogService = inject(IgntDialogService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #store = inject(RetailSetupStore);
  readonly accountsError = computed(() => this.#store.accountsError());
  readonly error = computed(() => this.#store.error());
  readonly isLoading = computed(() => this.#store.isLoading());
  readonly isLoadingAccounts = computed(() => this.#store.isLoadingAccounts());
  readonly retailSetupAccounts = computed(() => this.#store.retailSetupAccounts());
  readonly selectedRetailOptionType = computed(() => this.#store.selectedRetailOptionType());

  constructor() {
    this.#setupAccountsErrorRecoveryEffect();
    this.#setupNavigateAfterCreateEffect();
  }

  cancelCreation(): void {
    const { clearAccountsError, clearError, clearRetailAction, clearSelectedRetailOptionType } = this.#store;
    clearRetailAction();
    clearAccountsError();
    clearError();
    clearSelectedRetailOptionType();
  }

  createRetail(retailSetup: RetailSetupCreate): void {
    this.#store.createRetailSetup(retailSetup);
  }

  protected emptyStateClick(): void {
    const dialogRef = this.#igntDialogService.openModal<RetailSetupType | null>(RetailSelectionComponent, { size: 'sm' });
    dialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(result => {
      if (result !== undefined && result !== null) {
        this.#store.setSelectedRetailOptionType(result);
        if (result === 'odoo') {
          this.#store.fetchRetailSetupAccounts(result);
        }
      }
    });
  }

  #setupAccountsErrorRecoveryEffect(): void {
    effect(() => {
      const accountsError = this.#store.accountsError();
      const type = this.#store.selectedRetailOptionType();
      if (accountsError !== null && type === 'odoo') {
        untracked(() => {
          this.#store.clearSelectedRetailOptionType();
        });
      }
    });
  }

  #setupNavigateAfterCreateEffect(): void {
    effect(() => {
      const action = this.#store.retailAction();
      const setup = this.#store.retailSetup();
      if (action === 'createSuccess' && setup !== null) {
        untracked(() => {
          this.#store.clearRetailAction();
          const parent = this.#route.parent;
          if (parent !== null) {
            this.#router
              .navigate([setup.id], {
                relativeTo: parent,
                state: { productSyncAfterCreation: true } satisfies RetailViewNavigationState,
              })
              .catch((error: unknown) => {
                console.error('Navigation failed', error);
              });
          }
        });
      }
    });
  }
}
