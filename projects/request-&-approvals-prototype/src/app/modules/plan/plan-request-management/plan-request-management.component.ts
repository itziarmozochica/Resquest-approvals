import { Component, HostListener, inject, OnInit } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { of, throwError } from 'rxjs';
import { mergeMap, take } from 'rxjs/operators';

import { MessageModalComponent } from '../../../shared/components/message-modal/message-modal.component';
import { TableHeader } from '../../../shared/components/table/model/table-header';
import { PlanRequestCreateVisibilityService } from '../../../shared/layout/create-event-entry/plan-request-create-visibility.service';
import { ScreenSize } from '../../../shared/models/screen-size';
import { FeatureFlags } from '../../../shared/optimizely/feature-flags';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { Permissions } from '../../../shared/services/user/permissions';
import { trackById } from '../../../shared/utils/track-by';
import { PlanRequestStatus } from '../plan-request/models/plan-request/plan-request-status.enum';
import { PlanRequest } from '../plan-request/models/plan-request/plan-request.model';
import { PlanRequestService } from '../plan-request/services/plan-request.service';
import { DuplicatePlanModalComponent } from './duplicate-plan-modal/duplicate-plan-modal.component';

@Component({
  selector: 'app-plan-request-management',
  standalone: false,
  templateUrl: './plan-request-management.component.html',
  styleUrls: ['./plan-request-management.component.scss'],
})
export class PlanRequestManagementComponent implements OnInit {
  readonly #planRequestCreateVisibility = inject(PlanRequestCreateVisibilityService);
  readonly FeatureFlags = FeatureFlags;
  readonly Permissions = Permissions;
  planRequests: PlanRequest[] = [];
  planRequestId: string | undefined;
  isLoadingPlanRequests = false;
  createRequest = false;
  duplicatePlan = false;
  totalPlanRequests = 0;
  private partnerId: number = this.partnerService.getPartner()?.id ?? 0;
  pageSize = 15;
  page = 1;
  initialItemsPerPage = this.pageSize;
  initialPage = this.page;
  nextItemsPerPage!: number;
  nextPage!: number;
  moment = moment;
  trackById = trackById;
  headers: Array<TableHeader> = [];
  screenSize!: ScreenSize;
  innerWidth!: number;
  desktopScreenSize = ScreenSize.DESKTOP;
  tabletScreenSize = ScreenSize.TABLET;
  mobileScreenSize = ScreenSize.MOBILE;
  emptyImage = 'https://b2b-partners-prod.s3.eu-west-1.amazonaws.com/other/plan-with-no-photo.png';

  constructor(
    private planRequestService: PlanRequestService,
    private partnerService: PartnerService,
    private translate: TranslateService,
    private modalService: NgbModal,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.getPlanRequests();
    this.calculateResizeParams();
    this.updateTableHeaders();
  }

  get canShowCreateRequestDropdown(): boolean {
    return this.#planRequestCreateVisibility.canShowCreateRequestDropdown();
  }

  get planRequestStatus(): typeof PlanRequestStatus {
    return PlanRequestStatus;
  }

  setPlanRequestForm(planRequestId?: string): void {
    this.planRequestId = planRequestId;
    this.createRequest = true;
  }

  setDuplicatePlanForm(): void {
    this.duplicatePlan = true;
    this.modalService
      .open(DuplicatePlanModalComponent, { backdrop: 'static' })
      .closed.pipe(take(1))
      .subscribe(result => {
        if (result === false) {
          return;
        }
        if (result) {
          this.successModalResponse('Copy: ' + result);
        } else {
          this.errorModalResponse();
        }
      });
  }

  private successModalResponse(planName: string): void {
    const title = this.translateService.instant('common.success');
    const message = this.translateService.instant('planRequest.duplicateEvent.successMessage', { planName });
    this.showMessageModal(title, message);
  }

  private showMessageModal(title: string, message: string): void {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = title;
    modal.componentInstance.messages = [message];
    modal.closed.pipe(take(1)).subscribe(() => {
      this.loadRequests();
    });
  }

  private errorModalResponse(): void {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant('common.errorTitle');
    modal.componentInstance.messages = [this.translate.instant('errors.generic')];
  }

  loadRequests(): void {
    this.planRequests = [];
    this.page = 1;
    this.getPlanRequests();
    this.createRequest = false;
  }

  private getPlanRequests(): void {
    this.isLoadingPlanRequests = true;

    this.planRequestService
      .getPlanRequests({
        partnerId: this.partnerId,
        itemsPerPage: this.nextItemsPerPage || this.initialItemsPerPage,
        page: this.page || this.initialPage,
      })
      .pipe(mergeMap(response => (response?.data ? of(response) : throwError(() => new Error('Plan requests not found')))))
      .subscribe(
        response => {
          if (response.data) {
            this.planRequests = this.planRequests.concat(response.data);
            this.totalPlanRequests = response.data.length;
            this.nextItemsPerPage = response.getNextPaginationItemsPerPage() ?? 0;
            this.nextPage = response.getNextPaginationPage() ?? 0;
          }
          this.isLoadingPlanRequests = false;
        },
        () => {
          this.planRequests = [];
          this.nextItemsPerPage = 0;
          this.nextPage = 0;
          this.isLoadingPlanRequests = false;
          const modal = this.modalService.open(MessageModalComponent);
          modal.componentInstance.title = this.translate.instant('common.errorTitle');
          modal.componentInstance.messages = [this.translate.instant('planRequest.error')];
        },
      );
  }

  @HostListener('window:scroll', ['$event'])
  loadMore(): void {
    if (this.isLoadingPlanRequests) {
      return;
    }
    if (this.totalPlanRequests === 0) {
      return;
    }
    const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;
    if (pos + 2000 >= max) {
      if (this.nextPage) {
        this.page = this.nextPage;
        this.getPlanRequests();
      }
    }
  }

  private calculateResizeParams(): void {
    this.innerWidth = window.innerWidth;
    if (this.innerWidth >= 1200) {
      this.screenSize = ScreenSize.DESKTOP;
    } else if (this.innerWidth <= 1199.99 && this.innerWidth >= 992) {
      this.screenSize = ScreenSize.TABLET;
    } else if (this.innerWidth <= 991.99 && this.innerWidth >= 768) {
      this.screenSize = ScreenSize.TABLET;
    } else {
      this.screenSize = ScreenSize.MOBILE;
    }
  }
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.calculateResizeParams();
    this.updateTableHeaders();
  }

  private updateTableHeaders(): void {
    if (this.innerWidth >= 992) {
      this.headers = [
        {
          label: 'planRequestManagement.eventName',
          columnSize: 'calc(30% - 32px)',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'common.requester',
          columnSize: '20%',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'planRequestManagement.status',
          columnSize: '30%',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'planRequestManagement.createdAt',
          columnSize: '20%',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '15px',
        },
        {
          label: '',
          columnSize: '32px',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
      ];
    } else if (this.innerWidth <= 991.99 && this.innerWidth >= 768) {
      this.headers = [
        {
          label: 'planRequestManagement.eventName',
          columnSize: 'calc(45% - 32px)',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'common.requester',
          columnSize: '30%',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'planRequestManagement.createdAt',
          columnSize: '25%',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '15px',
        },
        {
          label: '',
          columnSize: '32px',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
      ];
    } else {
      this.headers = [
        {
          label: 'planRequestManagement.eventName',
          columnSize: 'calc(100% - 32px)',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: '',
          columnSize: '32px',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
      ];
    }
  }
}
