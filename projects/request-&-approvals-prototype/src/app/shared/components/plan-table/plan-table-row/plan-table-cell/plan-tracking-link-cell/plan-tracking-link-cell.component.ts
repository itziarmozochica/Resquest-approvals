import { Component, DestroyRef, inject, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AmbassadorTrackingLinkService } from '@fz-original/app/ambassadors/services/ambassador-tracking-link.service';
import { ClickShareB2CSiteEvent } from '@fz-original/app/core/tracking/core/events/click-share-b2c-site';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { ShareModalComponent } from '@fz-original/app/modules/plan/list-plan/components/share-modal/share-modal.component';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { catchError, map, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-plan-tracking-link-cell',
  standalone: false,
  templateUrl: './plan-tracking-link-cell.component.html',
  styleUrls: ['./plan-tracking-link-cell.component.scss'],
})
export class PlanTrackingLinkCellComponent {
  #partnerService = inject(PartnerService);
  #ambassadorTrackingLinkService = inject(AmbassadorTrackingLinkService);
  #toastService = inject(ToastService);
  #translateService = inject(TranslateService);
  #modalService = inject(NgbModal);
  #trackingService = inject(TrackingService);
  #destroyRef = inject(DestroyRef);

  @Input() b2cSiteHost?: string | null = null;
  @Input() channelId?: string | null = null;
  @Input() plan?: Plan | null = null;

  trackingLink: string | null = null;
  isTrackingLinkCopied = false;

  async onClickCopyTrackingLink(event: Event): Promise<void> {
    event.stopPropagation();
    const trackingLink = await this.ensureTrackingLink();
    if (!trackingLink) return;

    try {
      await navigator.clipboard.writeText(trackingLink);
    } catch {
      this.#toastService.add({
        message: this.#translateService.instant('listPlan.trackingLink.copyFailed'),
        type: ToastType.ERROR,
        delay: 3000,
        autoHide: true,
      });
      return;
    }

    this.trackClickShareB2CSiteEvent();

    this.isTrackingLinkCopied = true;
    setTimeout(() => {
      this.isTrackingLinkCopied = false;
    }, 3000);
  }

  async onClickShareTrackingLink(event: Event): Promise<void> {
    event.stopPropagation();

    const trackingLink = await this.ensureTrackingLink();
    if (!trackingLink) return;

    this.trackClickShareB2CSiteEvent();

    const modal = this.#modalService.open(ShareModalComponent);
    const component: ShareModalComponent = modal.componentInstance;
    component.link = () => this.trackingLink || '';
    component.message = `${this.#translateService.instant('listPlan.trackingLink.shareModal.message')} ${this.plan?.name || ''}`;
  }

  private async ensureTrackingLink(): Promise<string | null> {
    const current = this.trackingLink;
    if (current) return current;

    if (!this.plan || !this.channelId || !this.b2cSiteHost) return null;

    return new Promise(resolve => {
      this.#partnerService
        .partner$()
        .pipe(
          map(partner => partner?.id),
          switchMap(partnerId => {
            if (!partnerId || !this.plan?.id) return of(null);
            return this.#ambassadorTrackingLinkService.getTrackingLinkByPartnerId(
              partnerId,
              this.plan.id,
              this.channelId!,
              this.b2cSiteHost!,
            );
          }),
          map(result => result?.[0]?.trackingLink || null),
          catchError(error => {
            this.#toastService.add({
              message: this.#translateService.instant(error.message),
              type: ToastType.ERROR,
              delay: 3000,
              autoHide: true,
            });
            return of(null);
          }),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe(trackingLink => {
          this.trackingLink = trackingLink;
          resolve(trackingLink);
        });
    });
  }

  private trackClickShareB2CSiteEvent(): void {
    if (!this.trackingLink || !this.plan?.id) return;

    this.#trackingService.track(
      new ClickShareB2CSiteEvent({
        site_link: this.trackingLink,
        plan_id: this.plan.id,
      }),
    );
  }
}
