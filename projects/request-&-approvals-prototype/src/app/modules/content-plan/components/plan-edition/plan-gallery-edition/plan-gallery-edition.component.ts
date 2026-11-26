import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  Signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { IgntDialogService } from '@ignite/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, EMPTY, forkJoin, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, switchMap, take, takeUntil, tap, timeout } from 'rxjs/operators';

import { UpdateGalleryPlanEvent } from '../../../../../core/tracking/core/events/update-gallery-plan';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { MessageModalComponent } from '../../../../../shared/components/message-modal/message-modal.component';
import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { BaseResponse } from '../../../../../shared/models/base-response';
import { WithUnsavedChangesGuardComponent } from '../../../../../shared/models/with-unsaved-changes-guard-component.model';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { UploadedFileResponse } from '../../../models/file-upload-response';
import {
  EMPTY_GALLERY_LAYOUT,
  GALLERY_LAYOUT_MODES,
  GALLERY_VARIANT_ASPECT_RATIO,
  GalleryLayoutMode,
  getSixteenByNineVariant,
  PlanGallery,
  PlanMedia,
} from '../../../models/get-gallery';
import {
  PlanGalleryLayoutPatchDTO,
  PlanGalleryPatch,
  PlanGalleryPost,
  PlanMediaDTO,
  PlanMediaVariantPatchDTO,
  toGalleryLayoutPatchValue,
} from '../../../models/patch-gallery';
import { EditingPlanService } from '../../../services/editing-plan/editing-plan.service';
import { PlanGalleryService } from '../../../services/plan-gallery/plan-gallery.service';
import {
  UPLOAD_UNSUPPORTED_FILE_TYPE_ERROR_CODE,
  UPLOAD_UNSUPPORTED_FILE_TYPE_I18N_KEY,
} from '../../../services/upload-plan-image/upload-plan-image-error.util';
import { UploadPlanImageService } from '../../../services/upload-plan-image/upload-plan-image.service';
import {
  ApplyChangesScope,
  GalleryConfirmationModalComponent,
  GalleryConfirmationResponse,
} from './gallery-confirmation-modal/gallery-confirmation-modal.component';
import { GalleryImageCropModalComponent, GalleryImageCropModalData } from './gallery-image-crop-modal/gallery-image-crop-modal.component';
import {
  GALLERY_CROP_ASPECTS,
  GalleryCropAspect,
  isValidGalleryVideo,
  isValidSixteenByNineDimensions,
  readVideoDimensions,
  validateImagePreCrop,
} from './utils/gallery-image-crop.util';
import { GALLERY_IMAGE_MAX_SIZE_BYTES } from './utils/gallery-image-upload.constants';

const MAX_VIDEO_SIZE_IN_BYTES = 8 * Math.pow(2, 20);
const DEFAULT_PLAYBACK_RATE = 1;
const PERMISSIONS_REFRESH_TIMEOUT_MS = 5000;
/** b2b-iam gives these roles `can_manage_gallery_layout` exactly when the partner's admin holds it. */
const GALLERY_LAYOUT_GATE_ROLES: ReadonlySet<string> = new Set(['admin', 'event_manager', 'supervisor', 'content_manager']);

export function toPlaybackRate(rate: number | null | undefined): string {
  return `${rate ?? DEFAULT_PLAYBACK_RATE}`;
}

enum ComponentStateEnum {
  loading,
  error,
  ok,
}

enum GalleryActionEnum {
  createNewGallery,
  updateGallery,
  createNewGalleryFromExisting,
}

const FILE_TEMPLATE_URL =
  'https://docs.google.com/presentation/d/e/2PACX-1vS9LKEjvuObaY2FDASM7DXvSICK1YoKFD7cB-s_sx9kQlaEwuUuIO2fP09jfdwddFy48MAhZIbqJjoR/pub';

export type MediaType = 'photo' | 'video';

/**
 * The 16:9 asset hanging off a root. `id` is the `GalleryMediaAspectVariant` id when the row already
 * exists server-side, and `null` while the upload is only staged in the browser.
 */
export interface MediaVariantItem {
  id?: number | null;
  url: string;
  name?: string;
  poster?: string;
  playback_rate?: number;
}

export interface MediaListItem {
  media_type: MediaType;
  url: string;
  name?: string;
  id?: number | null;
  poster?: string;
  playback_rate?: number;
  /**
   * `undefined` means the root has no 16:9 asset and never had one; `null` means the partner removed
   * the one it had. The two differ on the wire: unchanged omits `variants`, removed sends `[]`.
   */
  sixteenByNine?: MediaVariantItem | null;
}

export interface GalleryLayoutOption {
  /** `null` is "Automatic": the site picks the arrangement, and the column stays NULL. */
  value: GalleryLayoutMode | null;
  labelKey: string;
}

const GALLERY_LAYOUT_LABEL_KEYS: Record<GalleryLayoutMode, string> = {
  one: 'planEdition.galleryEdition.galleryLayoutOne',
  two: 'planEdition.galleryEdition.galleryLayoutTwo',
  three: 'planEdition.galleryEdition.galleryLayoutThree',
  four: 'planEdition.galleryEdition.galleryLayoutFour',
  five: 'planEdition.galleryEdition.galleryLayoutFive',
  expanded: 'planEdition.galleryEdition.galleryLayoutExpanded',
};

export const GALLERY_LAYOUT_OPTIONS: ReadonlyArray<GalleryLayoutOption> = [
  { value: null, labelKey: 'planEdition.galleryEdition.galleryLayoutAutomatic' },
  ...GALLERY_LAYOUT_MODES.map(mode => ({ value: mode, labelKey: GALLERY_LAYOUT_LABEL_KEYS[mode] })),
];

@Component({
  selector: 'app-plan-gallery-edition',
  standalone: false,
  templateUrl: './plan-gallery-edition.component.html',
  styleUrls: ['./plan-gallery-edition.component.scss'],
})
export class PlanGalleryEditionComponent implements OnDestroy, WithUnsavedChangesGuardComponent {
  readonly #userService = inject(UserService);
  #breakpointStateService = inject(BreakpointStateService);
  #cdr = inject(ChangeDetectorRef);
  readonly #dialogService = inject(IgntDialogService);
  @Input() isDraftMode = false;
  @Input() isLastTab = false;
  @Output() saved = new EventEmitter<void>();
  @Output() saveFailed = new EventEmitter<void>();
  @ViewChild('savingModal', { static: true }) savingModal!: TemplateRef<unknown>;

  #partnerId: number | undefined;
  componentState = ComponentStateEnum.ok;
  componentStateEnum = ComponentStateEnum;
  planGallery?: PlanGallery;
  isUploadingFile = false;
  fileTemplateUrl = FILE_TEMPLATE_URL;
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  planSelectedOption?: SelectOption;
  galleryLayoutOptions = GALLERY_LAYOUT_OPTIONS;
  desktopGalleryLayout: GalleryLayoutMode | null = null;
  #initialDesktopGalleryLayout: GalleryLayoutMode | null = null;

  set photos(value: Array<MediaListItem>) {
    this.currentMediaList = value;
  }

  get photos(): Array<MediaListItem> {
    return this.currentMediaList;
  }

  get isGalleryDirty(): boolean {
    if (this.isDesktopGalleryLayoutDirty) {
      return true;
    }
    if (this.currentMediaList.length !== this.initialMediaList.length) {
      return true;
    }
    return this.currentMediaList.some(
      (item: MediaListItem, index: number) => this.#mediaItemIdentity(item) !== this.#mediaItemIdentity(this.initialMediaList[index]),
    );
  }

  /**
   * The pills behave as one radio group: re-activating the checked pill keeps it checked rather
   * than clearing the choice, so there is always a layout selected.
   */
  selectDesktopGalleryLayout(layout: GalleryLayoutMode | null): void {
    if (!this.canEditPlan() || !this.hasEditContentPermission()) {
      return;
    }
    this.desktopGalleryLayout = layout;
  }

  get isDesktopGalleryLayoutDirty(): boolean {
    return this.desktopGalleryLayout !== this.#initialDesktopGalleryLayout;
  }

  #mediaItemIdentity(item: MediaListItem): string {
    const idPart = item.id != null ? `id:${item.id}` : `url:${item.url}`;
    return `${idPart}|${item.media_type}|${item.poster ?? ''}|${item.playback_rate ?? ''}|${this.#variantIdentity(item)}`;
  }

  #variantIdentity(item: MediaListItem): string {
    const variant = this.#effectiveVariant(item);
    if (variant === undefined) {
      return 'none';
    }
    if (variant === null) {
      return 'removed';
    }
    return `16x9:${variant.id ?? variant.url}`;
  }

  /**
   * The card can only write `null` when the partner clears the 16:9 slot, so the gallery it loaded
   * decides what that `null` means: a row to delete, or a root that never had one and is back where
   * it started, which must not read as a change nor send `variants: []`.
   */
  #effectiveVariant(item: MediaListItem): MediaVariantItem | null | undefined {
    if (item.sixteenByNine !== null) {
      return item.sixteenByNine;
    }
    const loaded = this.initialMediaList.find(initial => initial.id != null && initial.id === item.id);
    return loaded?.sixteenByNine == null ? undefined : null;
  }

  private currentMediaList: Array<MediaListItem> = [];
  private initialMediaList: Array<MediaListItem> = [];
  private destroy$ = new Subject<void>();

  uploadFileCallback = (file: File): Observable<string | null> => this.uploadFile(file);
  uploadVariantFileCallback = (file: File, mediaType: MediaType): Observable<MediaVariantItem | null> =>
    this.#uploadVariantFile(file, mediaType);

  constructor(
    private editingPlan: EditingPlanService,
    private planGalleryService: PlanGalleryService,
    private partnerService: PartnerService,
    private uploadPlanImageService: UploadPlanImageService,
    private modalService: NgbModal,
    private translate: TranslateService,
    private trackingService: TrackingService,
  ) {
    const cancelPlanDetailsRequest = new Subject<void>();
    this.#partnerId = this.partnerService.getPartner()?.id;
    this.editingPlan
      .getSelectedPlanOption$()
      .pipe(
        takeUntil(this.destroy$),
        switchMap(option => {
          this.planSelectedOption = option;
          if (!this.planSelectedOption?.id) {
            this.componentState = ComponentStateEnum.ok;
            this.#cdr.markForCheck();
            return of(null);
          }
          cancelPlanDetailsRequest.next();
          if (!this.#partnerId) {
            this.componentState = ComponentStateEnum.ok;
            this.#cdr.markForCheck();
            return of(null);
          }
          return this.loadGallery(this.#partnerId, this.planSelectedOption.id).pipe(takeUntil(cancelPlanDetailsRequest));
        }),
      )
      .subscribe();

    combineLatest([this.editingPlan.observeCanEditPlan$(), this.#userService.observePermissions()])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.#cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  undo(): void {
    if (!this.canEditPlan() || !this.hasEditContentPermission() || !this.isGalleryDirty) {
      return;
    }
    this.currentMediaList = [...this.initialMediaList];
    this.desktopGalleryLayout = this.#initialDesktopGalleryLayout;
  }

  canEditPlan(): boolean {
    return this.editingPlan.canEditPlan();
  }

  canManageGalleryLayout(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_MANAGE_GALLERY_LAYOUT);
  }

  /** A variant on any card but the first is hidden, not deleted: it comes back when its root is first again. */
  isCoverVariantSlotVisible(): boolean {
    return this.canManageGalleryLayout() && this.desktopGalleryLayout === 'expanded';
  }

  hasEditContentPermission(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_EDIT_CONTENT) || this.#hasCreationOrReviewPermission();
  }

  areChangesUnsaved(): boolean {
    return this.isGalleryDirty || this.isUploadingFile;
  }

  canPublish(): boolean {
    const atLeastOneImage = this.currentMediaList?.some(item => item.media_type === 'photo');
    return this.isGalleryDirty && atLeastOneImage && !this.isUploadingFile;
  }

  publish(): void {
    if (!this.canEditPlan() || !this.hasEditContentPermission() || !this.canPublish() || !this.#partnerId || !this.planSelectedOption?.id) {
      this.saveFailed.emit();
      return;
    }

    if (this.#isExpandedWithoutCoverVariant()) {
      this.displayMessageModal('planEdition.galleryEdition.expandedCoverVariantMissingTitle', [
        'planEdition.galleryEdition.expandedCoverVariantMissingMessage',
      ]);
      this.saveFailed.emit();
      return;
    }

    const storedCover = this.#storedCoverDisplacedWithoutKey();
    if (storedCover) {
      this.#displayStoredCoverDisplacedModal(storedCover);
      this.saveFailed.emit();
      return;
    }

    const partnerId = this.#partnerId;
    const plan = this.planSelectedOption;

    let modal: NgbModalRef;
    let actionType: GalleryActionEnum;

    const action$ = this.isDraftMode
      ? of(this.#determineGalleryAction({ publish: true, applyChangesScope: null }))
      : this.askForUserConfirmation();

    action$
      .pipe(
        tap(() => (modal = this.displayLoadingModal())),
        mergeMap((action: GalleryActionEnum) => this.#resolveGalleryLayout().pipe(map(galleryLayout => ({ action, galleryLayout })))),
        mergeMap(({ action, galleryLayout }) => {
          // A kept layout is only known now for a gate role whose re-read failed, timed out or found the key.
          const displacedCover = galleryLayout === undefined ? this.#displacedStoredCover() : undefined;
          if (displacedCover) {
            this.#displayStoredCoverDisplacedModal(displacedCover);
            this.saveFailed.emit();
            return EMPTY;
          }
          actionType = action;
          const mediaItems: PlanMediaDTO[] = this.currentMediaList.map((item: MediaListItem) => this.mapMediaItem(item));
          const layoutPayload = galleryLayout === undefined ? {} : { gallery_layout: galleryLayout };
          switch (action) {
            case GalleryActionEnum.createNewGallery:
              return this.createGallery({ media: mediaItems, ...layoutPayload }, partnerId);
            case GalleryActionEnum.updateGallery:
              return this.updateGallery({ photos: mediaItems, ...layoutPayload }, partnerId, plan.id);
            case GalleryActionEnum.createNewGalleryFromExisting:
              return this.createGalleryFromExisting(this.currentMediaList, partnerId, galleryLayout);
            default:
              return EMPTY;
          }
        }),
        mergeMap(() => {
          this.sendMixpanelEvent(plan, actionType);
          return this.syncGalleryWithBackend(partnerId, plan.id).pipe(
            catchError(() => {
              this.componentState = ComponentStateEnum.error;
              return EMPTY;
            }),
          );
        }),
        finalize(() => modal?.close()),
      )
      .subscribe({
        next: () => {
          if (!this.isDraftMode) {
            this.displayMessageModal('planEdition.contentEdition.savingModalTitle', ['planEdition.contentEdition.savingChangesSuccess']);
          }
          this.saved.emit();
          this.editingPlan.triggerSelectedPlanChanged();
        },
        error: () => {
          this.displayMessageModal('common.errorTitle', [
            'planEdition.contentEdition.savingChangesError',
            'planEdition.contentEdition.savingChangesErrorContact',
          ]);
          this.saveFailed.emit();
        },
      });
  }

  #isExpandedWithoutCoverVariant(): boolean {
    return this.isCoverVariantSlotVisible() && !this.currentMediaList[0]?.sixteenByNine;
  }

  /**
   * Without the key the 16:9 slot is hidden, so the guard above never runs, yet the publish of a role
   * outside `GALLERY_LAYOUT_GATE_ROLES` keeps a stored Expanded layout (`#resolveGalleryLayout`), so it is
   * caught here, before the confirmation modal. A gate role's publish usually resets the layout to
   * Automatic, which is only known once the permissions are re-read, so `publish()` checks it again then.
   */
  #storedCoverDisplacedWithoutKey(): MediaListItem | undefined {
    const role = this.#userService.getSelectedOrganizationRole();
    if (this.canManageGalleryLayout() || (role !== null && GALLERY_LAYOUT_GATE_ROLES.has(role))) {
      return undefined;
    }
    return this.#displacedStoredCover();
  }

  /**
   * The stored Expanded cover had a 16:9 version and the item now first has none. A gallery whose stored
   * cover already had none is let through: a user without the key can neither see nor fix that.
   */
  #displacedStoredCover(): MediaListItem | undefined {
    const storedCover = this.initialMediaList[0];
    if (this.#initialDesktopGalleryLayout !== 'expanded' || !storedCover?.sixteenByNine) {
      return undefined;
    }
    return this.currentMediaList[0]?.sixteenByNine ? undefined : storedCover;
  }

  #displayStoredCoverDisplacedModal(storedCover: MediaListItem): void {
    this.displayMessageModal(
      'planEdition.galleryEdition.storedCoverDisplacedTitle',
      ['planEdition.galleryEdition.storedCoverDisplacedMessage', 'planEdition.galleryEdition.storedCoverDisplacedHelp'],
      { name: storedCover.name || '' },
    );
  }

  /**
   * Only `desktop` is sent: v1 exposes no mobile control, and naming `mobile` here would reset a
   * column this screen cannot show.
   */
  #mapDesktopGalleryLayout(): PlanGalleryLayoutPatchDTO {
    return { desktop: toGalleryLayoutPatchValue(this.desktopGalleryLayout) };
  }

  /**
   * `undefined` omits `gallery_layout`, which the API reads as "leave it". Only a gate role can tell the
   * partner lost the gate, so a custom role never resets a stored layout. The permissions are re-read
   * first: a tab opened before a Control Panel grant would otherwise wipe the layout. A failed or slow
   * re-read keeps it.
   */
  #resolveGalleryLayout(): Observable<PlanGalleryLayoutPatchDTO | undefined> {
    if (this.canManageGalleryLayout()) {
      return of(this.#mapDesktopGalleryLayout());
    }
    const role = this.#userService.getSelectedOrganizationRole();
    if (this.#initialDesktopGalleryLayout === null || role === null || !GALLERY_LAYOUT_GATE_ROLES.has(role)) {
      return of(undefined);
    }
    return this.#userService.reloadPermissionsInOrganization().pipe(
      timeout(PERMISSIONS_REFRESH_TIMEOUT_MS),
      map((permissions): PlanGalleryLayoutPatchDTO | undefined =>
        permissions.includes(Permissions.CAN_MANAGE_GALLERY_LAYOUT) ? undefined : { desktop: null },
      ),
      catchError(() => of(undefined)),
    );
  }

  private mapMediaItem(item: MediaListItem): PlanMediaDTO {
    if (item.id !== null && item.id !== undefined) {
      const variants = this.canManageGalleryLayout() ? this.#mapVariantsForExistingRoot(item) : undefined;
      return variants === undefined ? { id: item.id } : { id: item.id, variants };
    }

    return this.mapMediaItemForCreation(item);
  }

  /**
   * `undefined` leaves the root's variants alone, which is what an untouched root wants: the key is
   * omitted. `[]` deletes them. A staged upload replaces them, and the old row is dropped by being
   * left out rather than by sending its id alongside the new file.
   */
  #mapVariantsForExistingRoot(item: MediaListItem): Array<PlanMediaVariantPatchDTO> | undefined {
    const variant = this.#effectiveVariant(item);
    if (variant === undefined) {
      return undefined;
    }
    if (variant === null) {
      return [];
    }
    if (variant.id != null) {
      return undefined;
    }
    return [this.#mapVariantForCreation(item, variant)];
  }

  #mapVariantForCreation(item: MediaListItem, variant: MediaVariantItem): PlanMediaVariantPatchDTO {
    const newVariant: PlanMediaVariantPatchDTO = {
      url: variant.url,
      name: variant.name || '',
      aspect_ratio: GALLERY_VARIANT_ASPECT_RATIO,
    };

    if (item.media_type === 'video') {
      return {
        ...newVariant,
        poster: variant.poster,
        playback_rate: toPlaybackRate(variant.playback_rate ?? item.playback_rate),
      };
    }

    return newVariant;
  }

  private mapMediaItemForCreation(item: MediaListItem): PlanMediaDTO {
    const variant = item.sixteenByNine;
    const mediaItem: PlanMediaDTO = {
      url: item.url,
      name: item.name || '',
      ...(variant ? { variants: [this.#mapVariantForCreation(item, variant)] } : {}),
    };

    if (item.media_type === 'video') {
      return {
        ...mediaItem,
        poster: item.poster,
        playback_rate: toPlaybackRate(item.playback_rate),
      };
    }

    return mediaItem;
  }

  private updateGallery(newGallery: PlanGalleryPatch, partnerId: number, planId: number): Observable<void> {
    if (this.planGallery?.id == undefined) {
      return EMPTY;
    }
    return this.planGalleryService.updateGallery(partnerId, planId, this.planGallery.id, newGallery);
  }

  private createGallery(newGallery: PlanGalleryPost, partnerId: number): Observable<void> {
    return this.planGalleryService.createGallery(partnerId, this.planSelectedOption?.id, newGallery);
  }

  /**
   * The copy duplicates stored variants even without the key: it must not lose what the source gallery holds.
   * The layout needs no copying: it lives on the plan's gallery row, which the POST keeps, only swapping its
   * `gallery_id`, so an omitted `gallery_layout` leaves it as stored.
   */
  private createGalleryFromExisting(
    currentMediaList: Array<MediaListItem>,
    partnerId: number,
    galleryLayout: PlanGalleryLayoutPatchDTO | undefined,
  ): Observable<void> {
    const planId: number | undefined = this.planSelectedOption?.id;

    if (!planId) {
      return EMPTY;
    }

    const existingMediaItems = currentMediaList.filter(item => item.id != null);
    const newMediaItems = currentMediaList.filter(item => item.id == null);

    const posterlessItem = existingMediaItems.find(item => this.#isVideoVariantMissingPoster(item));
    if (posterlessItem) {
      this.displayMessageModal(
        'planEdition.galleryEdition.variantMissingPosterTitle',
        ['planEdition.galleryEdition.variantMissingPosterMessage'],
        { name: posterlessItem.name || '' },
      );
      this.saveFailed.emit();
      return EMPTY;
    }

    if (existingMediaItems.length === 0) {
      const mediaItems: PlanMediaDTO[] = newMediaItems.map(item => this.mapMediaItemForCreation(item));
      return this.planGalleryService.createGallery(partnerId, planId, {
        media: mediaItems,
        ...(galleryLayout === undefined ? {} : { gallery_layout: galleryLayout }),
      });
    }

    const duplicateRequests = existingMediaItems.map(item => {
      const normalizedItem = { ...item, url: this.#removeCloudinaryTransforms(item.url) };
      return item.media_type === 'video'
        ? this.#duplicateVideo(normalizedItem, partnerId, planId)
        : this.#duplicateImage(normalizedItem, partnerId, planId);
    });

    return forkJoin(duplicateRequests).pipe(
      map(duplicatedItems => {
        const allItems = [...duplicatedItems, ...newMediaItems];
        const mediaItems: PlanMediaDTO[] = allItems.map(item => this.mapMediaItemForCreation(item));
        return mediaItems;
      }),
      mergeMap(mediaItems =>
        this.planGalleryService.createGallery(partnerId, planId, {
          media: mediaItems,
          ...(galleryLayout === undefined ? {} : { gallery_layout: galleryLayout }),
        }),
      ),
    );
  }

  #removeCloudinaryTransforms(url: string): string {
    try {
      return new URL(url).hostname === 'applications-media.feverup.com' ? url.replace(/f_auto,/, '') : url;
    } catch {
      return url;
    }
  }

  private sendMixpanelEvent(plan: SelectOption, actionType: GalleryActionEnum): void {
    this.trackingService.track(
      new UpdateGalleryPlanEvent({
        action_type: this.getActionTypeString(actionType),
        plan_id: plan.id,
        plan_name: plan.title,
      }),
    );
  }

  private getActionTypeString(actionType: GalleryActionEnum): string {
    switch (actionType) {
      case GalleryActionEnum.createNewGallery:
        return 'Created new gallery';
      case GalleryActionEnum.updateGallery:
        return 'Updated existing gallery';
      case GalleryActionEnum.createNewGalleryFromExisting:
        return 'Created gallery from existing';
    }
  }

  #determineGalleryAction({ applyChangesScope }: GalleryConfirmationResponse): GalleryActionEnum {
    if (applyChangesScope === null) {
      return this.planGallery?.id == null ? GalleryActionEnum.createNewGallery : GalleryActionEnum.updateGallery;
    }
    return applyChangesScope === ApplyChangesScope.allEvents
      ? GalleryActionEnum.updateGallery
      : GalleryActionEnum.createNewGalleryFromExisting;
  }

  /**
   * A copied 16:9 video row is created by url, and the API rejects one without a poster. The source
   * gallery can hold a variant whose poster is null, so it is caught here rather than as a 400.
   */
  #isVideoVariantMissingPoster(item: MediaListItem): boolean {
    return item.media_type === 'video' && !!item.sixteenByNine && !item.sixteenByNine.poster;
  }

  #duplicateImage(item: MediaListItem, partnerId: number, planId: number): Observable<MediaListItem> {
    return this.uploadPlanImageService.duplicateFileByReupload(partnerId, planId, item.url, item.name || '').pipe(
      mergeMap(response =>
        this.#duplicateSixteenByNine(item, partnerId, planId).pipe(
          map(sixteenByNine => ({
            ...item,
            url: response.fileUrl,
            name: item.name,
            sixteenByNine,
          })),
        ),
      ),
      catchError(error => throwError(() => new Error(`Failed to duplicate file ${item.name}: ${error.message}`))),
    );
  }

  /**
   * The copy must own its files, so the 16:9 asset is re-uploaded like the root and the new row is
   * created by url. Carrying the old variant id over would tie the new gallery to the old one's row.
   */
  #duplicateSixteenByNine(item: MediaListItem, partnerId: number, planId: number): Observable<MediaVariantItem | null | undefined> {
    const variant = item.sixteenByNine;
    if (!variant) {
      return of(variant);
    }

    const name = variant.name || '';
    const video = this.uploadPlanImageService.duplicateFileByReupload(
      partnerId,
      planId,
      this.#removeCloudinaryTransforms(variant.url),
      name,
    );
    const poster = variant.poster
      ? this.uploadPlanImageService.duplicateFileByReupload(partnerId, planId, this.#removeCloudinaryTransforms(variant.poster), name)
      : of(null);

    return forkJoin({ asset: video, poster }).pipe(
      map(
        (response): MediaVariantItem => ({
          id: null,
          url: response.asset.fileUrl,
          name: variant.name,
          poster: response.poster?.fileUrl,
          playback_rate: variant.playback_rate,
        }),
      ),
    );
  }

  #duplicateVideo(item: MediaListItem, partnerId: number, planId: number): Observable<MediaListItem> {
    const videoUpload = this.uploadPlanImageService.duplicateFileByReupload(partnerId, planId, item.url, item.name || '');
    const poster = item.poster;

    if (poster === undefined || poster === null || poster === '') {
      return videoUpload.pipe(
        mergeMap(response =>
          this.#duplicateSixteenByNine(item, partnerId, planId).pipe(
            map(sixteenByNine => ({
              ...item,
              url: response.fileUrl,
              name: item.name,
              sixteenByNine,
            })),
          ),
        ),
        catchError(error => throwError(() => new Error(`Failed to duplicate video ${item.name}: ${error.message}`))),
      );
    }

    const posterUpload = this.uploadPlanImageService.duplicateFileByReupload(partnerId, planId, poster, item.name || '');

    return forkJoin({
      video: videoUpload,
      poster: posterUpload,
      sixteenByNine: this.#duplicateSixteenByNine(item, partnerId, planId),
    }).pipe(
      map(response => {
        return {
          ...item,
          url: response.video.fileUrl,
          poster: response.poster.fileUrl,
          name: item.name,
          sixteenByNine: response.sixteenByNine,
        };
      }),
      catchError(error => throwError(() => new Error(`Failed to duplicate video/poster ${item.name}: ${error.message}`))),
    );
  }

  private askForUserConfirmation(): Observable<GalleryActionEnum> {
    const modal = this.modalService.open(GalleryConfirmationModalComponent, {
      backdrop: 'static',
      windowClass: 'gallery-confirmation-modal-custom',
    });
    const component = modal.componentInstance as GalleryConfirmationModalComponent;

    if (this.planGallery === undefined) {
      return EMPTY;
    }

    component.otherPlansSharingGallery = this.planGallery.num_plans_using_gallery > 0 ? this.planGallery.num_plans_using_gallery - 1 : 0;

    return component.response.pipe(
      take(1),
      finalize(() => modal.close()),
      filter((response: GalleryConfirmationResponse) => response.publish),
      map((response: GalleryConfirmationResponse) => this.#determineGalleryAction(response)),
    );
  }

  private getMediaListFormPlanGalleryPhotos(photos: PlanMedia[]): MediaListItem[] {
    return photos.map((item: PlanMedia) => {
      const variant = getSixteenByNineVariant(item);
      return {
        id: item.id,
        name: item.name,
        url: item.url,
        media_type: item.media_type,
        poster: item.poster,
        playback_rate: item.playback_rate,
        sixteenByNine: variant && {
          id: variant.id,
          name: variant.name,
          url: variant.url,
          poster: variant.poster ?? undefined,
          playback_rate: variant.playback_rate ?? undefined,
        },
      };
    });
  }

  private loadGallery(partnerId: number, planId: number): Observable<unknown> {
    this.componentState = ComponentStateEnum.loading;
    this.#cdr.markForCheck();
    return this.syncGalleryWithBackend(partnerId, planId).pipe(
      tap(() => {
        this.componentState = ComponentStateEnum.ok;
        this.#cdr.markForCheck();
      }),
      catchError(() => {
        this.componentState = ComponentStateEnum.error;
        this.#cdr.markForCheck();
        return EMPTY;
      }),
    );
  }

  private requestGallery(partnerId: number, planId: number): Observable<PlanGallery> {
    return this.planGalleryService.getGallery(partnerId, planId).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err?.status === 404) {
          return of({
            data: {
              id: null,
              name: null,
              gallery_layout: { ...EMPTY_GALLERY_LAYOUT },
              media: [],
              num_plans_using_gallery: 0,
            },
            error: {},
          });
        }
        return throwError(err);
      }),
      map(response => {
        if (!response.data) {
          throw response.error;
        }
        return response.data;
      }),
    );
  }

  private syncGalleryWithBackend(partnerId: number, planId: number): Observable<PlanGallery> {
    return this.requestGallery(partnerId, planId).pipe(
      tap(gallery => {
        this.planGallery = gallery;
        this.initialMediaList = this.getMediaListFormPlanGalleryPhotos(gallery?.media ?? []);
        this.currentMediaList = [...this.initialMediaList];
        this.#initialDesktopGalleryLayout = gallery?.gallery_layout?.desktop ?? null;
        this.desktopGalleryLayout = this.#initialDesktopGalleryLayout;
      }),
    );
  }

  #uploadVariantFile(file: File, mediaType: MediaType): Observable<MediaVariantItem | null> {
    const upload$ = mediaType === 'video' ? this.#uploadVideoVariant(file) : this.#uploadPhotoVariant(file);

    return upload$.pipe(map((url): MediaVariantItem | null => (url === null ? null : { id: null, url, name: file.name })));
  }

  #uploadPhotoVariant(file: File): Observable<string | null> {
    const planId: number | undefined = this.planSelectedOption?.id;
    if (!planId) {
      return EMPTY;
    }

    return validateImagePreCrop(file, 'sixteenByNine').pipe(
      mergeMap(result => {
        if (result.status !== 'valid') {
          this.#displayInvalidVariantImage();
          return EMPTY;
        }
        return this.#openImageCropModal(file, 'sixteenByNine');
      }),
      mergeMap(croppedFile => {
        if (!croppedFile) {
          return EMPTY;
        }
        if (croppedFile.size > GALLERY_IMAGE_MAX_SIZE_BYTES) {
          this.displayMessageModal('planEdition.galleryEdition.invalidImageTitle', ['planEdition.galleryEdition.cropPrepareError']);
          return EMPTY;
        }
        return this.#uploadFileToServer(croppedFile, planId);
      }),
    );
  }

  #uploadVideoVariant(file: File): Observable<string | null> {
    const planId: number | undefined = this.planSelectedOption?.id;
    if (!planId) {
      return EMPTY;
    }

    if (!isValidGalleryVideo(file)) {
      this.displayMessageModal('planEdition.galleryEdition.invalidVideoTitle', ['planEdition.galleryEdition.invalidVariantVideoMessage']);
      return EMPTY;
    }

    return readVideoDimensions(file).pipe(
      mergeMap(dimensions => {
        if (!dimensions) {
          this.displayMessageModal('planEdition.galleryEdition.invalidVideoTitle', [
            'planEdition.galleryEdition.unreadableVariantVideoMessage',
          ]);
          return EMPTY;
        }
        if (!isValidSixteenByNineDimensions(dimensions)) {
          this.#displayInvalidVariantVideo();
          return EMPTY;
        }
        return this.#uploadFileToServer(file, planId);
      }),
    );
  }

  #displayInvalidVariantImage(): void {
    this.displayMessageModal('planEdition.galleryEdition.invalidImageTitle', ['planEdition.galleryEdition.invalidVariantImageMessage'], {
      minHeight: GALLERY_CROP_ASPECTS.sixteenByNine.minHeight,
      minSize: GALLERY_CROP_ASPECTS.sixteenByNine.minWidth,
    });
  }

  #displayInvalidVariantVideo(): void {
    this.displayMessageModal(
      'planEdition.galleryEdition.invalidVideoTitle',
      ['planEdition.galleryEdition.invalidVariantVideoAspectMessage'],
      {
        minHeight: GALLERY_CROP_ASPECTS.sixteenByNine.minHeight,
        minSize: GALLERY_CROP_ASPECTS.sixteenByNine.minWidth,
      },
    );
  }

  private uploadFile(file: File): Observable<string | null> {
    if (!file || !file.type) {
      return of(null);
    }
    const planId: number | undefined = this.planSelectedOption?.id;

    if (!planId) {
      return EMPTY;
    }

    if (file.type.includes('video')) {
      return this.#uploadVideo(file, planId);
    }

    return this.#uploadCroppedImage(file, planId);
  }

  #uploadCroppedImage(file: File, planId: number): Observable<string | null> {
    return validateImagePreCrop(file).pipe(
      mergeMap(result => {
        if (result.status === 'invalid_file') {
          this.displayMessageModal('planEdition.galleryEdition.invalidImageTitle', ['planEdition.galleryEdition.invalidImageMessage']);
          return EMPTY;
        }

        if (result.status === 'too_small') {
          this.displayMessageModal(
            'planEdition.galleryEdition.invalidImageTitle',
            ['planEdition.galleryEdition.invalidImageTooSmallMessage'],
            {
              width: result.width,
              height: result.height,
              minSize: result.minSize,
            },
          );
          return EMPTY;
        }

        return this.#openImageCropModal(file);
      }),
      mergeMap(croppedFile => {
        if (!croppedFile) {
          return EMPTY;
        }
        if (croppedFile.size > GALLERY_IMAGE_MAX_SIZE_BYTES) {
          this.displayMessageModal('planEdition.galleryEdition.invalidImageTitle', ['planEdition.galleryEdition.cropPrepareError']);
          return EMPTY;
        }
        return this.#uploadFileToServer(croppedFile, planId);
      }),
    );
  }

  #uploadVideo(file: File, planId: number): Observable<string | null> {
    if (!this.#isValidVideo(file)) {
      this.displayMessageModal('planEdition.galleryEdition.invalidVideoTitle', ['planEdition.galleryEdition.invalidVideoMessage']);
      return EMPTY;
    }

    return this.#uploadFileToServer(file, planId);
  }

  #openImageCropModal(file: File, aspect: GalleryCropAspect = 'square'): Observable<File | null> {
    const dialogRef = this.#dialogService.openModal<File, GalleryImageCropModalData>(GalleryImageCropModalComponent, {
      data: { aspect, imageFile: file },
      disableCloseShortcuts: true,
      size: 'lg',
    });

    return dialogRef.closed$.pipe(
      take(1),
      map(result => result ?? null),
    );
  }

  #uploadFileToServer(file: File, planId: number): Observable<string | null> {
    if (this.#partnerId === undefined) {
      return throwError(() => new Error('Partner ID is undefined'));
    }

    this.isUploadingFile = true;

    return this.uploadPlanImageService.uploadFile(this.#partnerId, planId, file).pipe(
      finalize(() => (this.isUploadingFile = false)),
      map(this.mapUploadImageResponse),
      catchError((error: { code?: string }) => {
        const messageKey =
          error?.code === UPLOAD_UNSUPPORTED_FILE_TYPE_ERROR_CODE
            ? UPLOAD_UNSUPPORTED_FILE_TYPE_I18N_KEY
            : 'planEdition.contentEdition.uploadingPhotoError';
        this.displayMessageModal('common.errorTitle', [messageKey]);
        return EMPTY;
      }),
      map(response => response?.fileUrl ?? null),
    );
  }

  private mapUploadImageResponse(response: BaseResponse<UploadedFileResponse | null>): UploadedFileResponse {
    if (response === null || !response.data) {
      throw response?.error ?? {};
    }
    return response.data;
  }

  #isValidVideo(file: File): boolean {
    return ['video/mp4'].includes(file.type) && file.size <= MAX_VIDEO_SIZE_IN_BYTES;
  }

  private displayLoadingModal(): NgbModalRef {
    return this.modalService.open(this.savingModal, { backdrop: 'static' });
  }

  private displayMessageModal(titleKey: string, messageKeys: Array<string>, interpolateParams?: Record<string, unknown>): NgbModalRef {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant(titleKey);
    modal.componentInstance.messages = messageKeys.map(key => this.translate.instant(key, interpolateParams));
    return modal;
  }

  #hasCreationOrReviewPermission(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) || this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    );
  }
}
