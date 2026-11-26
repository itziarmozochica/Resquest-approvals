import { Component, DestroyRef, ElementRef, HostListener, inject, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { IgntButtonIcon } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

import { SpinnerService } from '../../../../../shared/layout/spinner/spinner.service';
import { PlanDetail } from '../../../../../shared/models/plan/plan-detail.model';
import { PlanStatus } from '../../../../../shared/models/plan/plan-status.enum';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { ToastService, ToastType } from '../../../../../shared/services/toast/toast.service';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { trackById } from '../../../../../shared/utils/track-by';
import { BrandedEventPreviewService } from '../../../../branding/services/branded-event-preview.service';
import { PurchaseConfirmationPreviewService } from '../../../../branding/services/purchase-confirmation-preview.service';

@Component({
  selector: 'app-plan-header-card',
  standalone: false,
  styleUrl: './plan-header-card.component.scss',
  templateUrl: './plan-header-card.component.html',
})
export class PlanHeaderCardComponent {
  readonly #brandedEventPreviewService = inject(BrandedEventPreviewService);
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #elementRef = inject(ElementRef);
  readonly #partnerService = inject(PartnerService);
  readonly #userService = inject(UserService);
  readonly #purchaseConfirmationPreviewService = inject(PurchaseConfirmationPreviewService);
  readonly #spinnerService = inject(SpinnerService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  @Input() hasUnsavedChanges: () => boolean = () => false;

  @Input() set planDetail(value: Partial<PlanDetail>) {
    this.isDraft = value?.status == PlanStatus.DRAFT;
    this.link = value?.absoluteUrl || '';
    this.name = value?.name || '';
    this.venue = this.#getPlanVenue(value) || '';
    this.image = value?.gallery?.[0] || '';
    this.hasThemedUrl = !!value?.themedUrl;
    this.themedLink = value?.themedUrl || '';
    this.mainPlanId = value?.id || 0;
    this.partnerId = value?.partnerId ?? 0;
  }

  protected readonly chevronDownIcon: IgntButtonIcon = { name: 'chevron-down', variant: 'light' };
  protected readonly chevronUpIcon: IgntButtonIcon = { name: 'chevron-up', variant: 'light' };
  protected readonly externalLinkIcon: IgntButtonIcon = { name: 'external-link-alt', variant: 'light' };

  canCreateEvents = this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS);
  hasThemedUrl = false;
  image = '';
  isDraft = false;
  isMobile = this.#breakpointStateService.getStateProp('isMobile');
  isPreviewDropdownOpen = false;
  link = '';
  mainPlanId = 0;
  name = '';
  partnerId = 0;
  themedLink = '';

  trackById = trackById;

  venue = '';

  @HostListener('document:click', ['$event'])
  closeDropdownOnClickOutside(event: MouseEvent): void {
    const target = event.target as Element;
    const previewDropdownElement = (this.#elementRef.nativeElement as Element).querySelector('.preview-dropdown');

    if (this.isPreviewDropdownOpen && previewDropdownElement && !previewDropdownElement.contains(target)) {
      this.isPreviewDropdownOpen = false;
    }
  }

  onPreviewBrandedEvent(event: Event): void {
    event.preventDefault();
    this.isPreviewDropdownOpen = false;

    const partnerId = this.#getCurrentPartnerId();
    if (!partnerId || !this.mainPlanId) {
      this.#showErrorToast('planEdition.errors.previewUnavailable');
      return;
    }

    this.#spinnerService.show();

    this.#brandedEventPreviewService
      .getPreviewUrlByPlanId(partnerId, this.mainPlanId)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.#spinnerService.hide();
        }),
      )
      .subscribe({
        next: (url: string | null) => {
          if (url) {
            window.open(url, '_blank');
          } else {
            this.#showErrorToast('planEdition.errors.previewUnavailable');
          }
        },
        error: () => {
          this.#showErrorToast('planEdition.errors.previewUnavailable');
        },
      });
  }

  onPreviewEventOnFever(event: Event): void {
    event.preventDefault();
    this.isPreviewDropdownOpen = false;
    this.seePlanOnFever();
  }

  onPreviewPurchaseConfirmationEmail(event: Event): void {
    event.preventDefault();
    this.isPreviewDropdownOpen = false;

    const partnerId = this.#getCurrentPartnerId();
    if (!partnerId || !this.mainPlanId) {
      this.#showErrorToast('planEdition.errors.previewUnavailable');
      return;
    }

    this.#spinnerService.show();

    this.#purchaseConfirmationPreviewService
      .getPreviewUrlByPlanId(partnerId, this.mainPlanId)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.#spinnerService.hide();
        }),
      )
      .subscribe({
        next: (url: string | null) => {
          if (url) {
            window.open(url, '_blank');
          } else {
            this.#showErrorToast('planEdition.errors.previewUnavailable');
          }
        },
        error: () => {
          this.#showErrorToast('planEdition.errors.previewUnavailable');
        },
      });
  }

  async openThemedUrl(): Promise<void> {
    if (!this.themedLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.themedLink);
      this.#toastService.add({
        message: this.#translateService.instant('planEdition.brandedLinkCopiedToClipboard'),
        type: ToastType.SUCCESS,
        delay: 3000,
        autoHide: true,
      });
    } finally {
      window.open(this.themedLink, '_blank');
    }
  }

  seePlanOnFever(): void {
    if (!this.link) {
      return;
    }
    window.open(this.link, '_blank');
  }

  togglePreviewDropdown(): void {
    this.isPreviewDropdownOpen = !this.isPreviewDropdownOpen;
  }

  #getCurrentPartnerId(): number | undefined {
    const currentPartner = this.#partnerService.getPartner();
    return currentPartner?.id;
  }

  #getPlanVenue(value: Partial<PlanDetail>): string | null {
    if (!value?.venues) {
      return null;
    }
    return value.venues.length > 1 ? this.#translateService.instant('listPlan.multipleVenues') : value.venues[0]?.name;
  }

  #showErrorToast(messageKey: string): void {
    this.#toastService.add({
      message: this.#translateService.instant(messageKey),
      autoHide: true,
      type: ToastType.ERROR,
    });
  }
}
