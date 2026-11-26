import { NgClass, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnChanges,
  output,
  Output,
  signal,
  SimpleChanges,
  untracked,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { OrganizationFavoriteStarComponent } from '@fz-original/app/shared/components/organization-favorite-star/organization-favorite-star.component';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { OrganizationTypeEnum } from '@fz-original/app/shared/models/partner/organization-type.enum';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { ControlPanelAccessContextService } from '@fz-original/app/shared/services/control-panel-access-context/control-panel-access-context.service';
import { ControlPanelExitService } from '@fz-original/app/shared/services/control-panel-exit/control-panel-exit.service';
import { OrganizationPreferencesService } from '@fz-original/app/shared/services/organization-preferences/organization-preferences.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntDialogHeaderComponent,
  IgntDialogRef,
  IgntDialogService,
  IgntMediaQueriesService,
  IgntPillButtonComponent,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntPillComponent } from '@ignite/legacy/components/ignt-pill/ignt-pill.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, finalize, map, tap } from 'rxjs/operators';

import { Organization } from '../../../shared/models/organization/organization.model';
import { trackById } from '../../../shared/utils/track-by';
import { LoginFormContainerModule } from '../login-form-container/login-form-container.module';
import { SelectOrganizationDialogData } from '../models/select-organization-dialog-data.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntDialogHeaderComponent,
    NgClass,
    NgFor,
    NgIf,
    NgTemplateOutlet,
    TranslateModule,
    LoginFormContainerModule,
    OrganizationFavoriteStarComponent,
    IgntIconComponent,
    IgntCheckboxComponent,
    IgntPillButtonComponent,
    IgntPillComponent,
    IgntSkeletonBaseComponent,
  ],
  selector: 'app-select-organization',
  styleUrl: './select-organization.component.scss',
  templateUrl: './select-organization.component.html',
})
export class SelectOrganizationComponent implements AfterViewInit, OnChanges {
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #controlPanelAccessContextService = inject(ControlPanelAccessContextService);
  readonly #controlPanelExitService = inject(ControlPanelExitService);
  readonly #dialogData = inject<SelectOrganizationDialogData | null>(IGNT_DIALOG_DATA, { optional: true });
  readonly #dialogRef = inject<IgntDialogRef<number> | null>(IGNT_DIALOG_REF, { optional: true });
  readonly #dialogService = inject(IgntDialogService);
  protected readonly isDialog = this.#dialogData !== null;
  #destroyRef = inject(DestroyRef);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #injector = inject(Injector);
  readonly #inputValue = signal('');
  #listSearch = '';
  readonly #mediaQueriesService = inject(IgntMediaQueriesService);
  readonly #organizationPreferencesService = inject(OrganizationPreferencesService);
  readonly #loading = signal(false);
  readonly #isLoading = computed(() => (this.#dialogData ? this.#dialogData.loading() : this.#loading()));
  readonly #organizations = signal<Organization[]>([]);
  readonly #listOrganizations = computed(() => this.#dialogData?.organizations() ?? this.#organizations());
  readonly #spinnerService = inject(SpinnerService);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);
  @Input() componentAsModal = false;
  @Input() showTitle = true;
  openControlPanel = output<void>();
  constructor() {
    this.#updateShowControlPanelEntry();

    if (this.#dialogData) {
      this.componentAsModal = true;
      this.showLogout = false;
      this.showTitle = false;
    }

    effect(() => {
      if (this.#busy() || untracked(this.#ready)) {
        return;
      }
      this.#ready.set(true);
      afterNextRender(() => this.searchInput?.nativeElement.focus(), { injector: this.#injector });
    });

    this.#userService
      .getUserObservable()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#updateShowControlPanelEntry();
        this.#cdr.markForCheck();
      });
  }
  getOrganizationClasses(organization: Organization): string {
    const typeClass = this.getOrganizationTypeClass(organization.type);
    const deletedClass = organization.isDeleted() ? 'organization--deleted' : '';

    return [typeClass, deletedClass].filter(Boolean).join(' ');
  }

  getOrganizationTypeClass(type: OrganizationTypeEnum): string {
    switch (type) {
      case OrganizationTypeEnum.PARTNER:
        return 'organization--partner';
      case OrganizationTypeEnum.RESELLER:
        return 'organization--reseller';
    }
  }

  @Output() loadMoreOrganizations = new EventEmitter<void>();
  @Output() logoutEmitter = new EventEmitter<void>();
  getRecentOrganizationIcon(recentOrganization: Organization): IconProp {
    return recentOrganization.type === OrganizationTypeEnum.PARTNER ? ['far', 'building'] : ['far', 'user'];
  }
  get inputValue(): string {
    return this.#inputValue();
  }
  set inputValue(value: string) {
    this.#inputValue.set(value);
  }
  protected readonly OrganizationTypeEnum = OrganizationTypeEnum;
  protected readonly favoritesLoading = this.#organizationPreferencesService.loading;
  readonly #busy = computed(() => this.#isLoading() || this.favoritesLoading());
  readonly #ready = signal(false);
  protected readonly showSkeleton = computed(() => !this.#ready() && this.#busy());
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  readonly recentOrganizations = this.#organizationPreferencesService.recentOrganizations;
  searchBarFilter = '';
  @ViewChild('search', { static: false }) searchInput: ElementRef | null = null;
  @Output() searchOrganization = new EventEmitter<string>();
  @Output() selectedOrganization = new EventEmitter<number>();
  showDeleted = false;
  @Output() showDeletedChanged = new EventEmitter<boolean>();
  protected readonly searchPlaceholderKey = computed(() =>
    this.#mediaQueriesService.isMobile() ? 'common.search' : 'selectOrganization.search',
  );
  readonly showFavorites = signal(false);
  readonly visibleOrganizations = computed(() => {
    if (!this.showFavorites()) {
      return this.#listOrganizations();
    }
    const searchTerm = this.#inputValue().trim().toLowerCase();
    const favorites = this.#organizationPreferencesService.favoriteOrganizations();
    return searchTerm === ''
      ? favorites
      : favorites.filter(organization => organization.name.toLowerCase().includes(searchTerm) || organization.id.toString() === searchTerm);
  });
  @Input() showLogout = true;
  trackById = trackById;
  readonly showControlPanelEntry = signal(false);
  userId: number | null = null;

  @Input()
  get loading(): boolean {
    return this.#isLoading();
  }

  set loading(loading: boolean) {
    this.#loading.set(loading);
  }

  logout(): void {
    this.logoutEmitter.emit();
  }

  navigateToControlPanel(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.#spinnerService.show();
    this.#userService
      .getMe({ skipBusinessDetailsEnrichment: true })
      .pipe(
        tap(response => this.#controlPanelAccessContextService.applyAccessContext(response?.data ?? null)),
        finalize(() => this.#spinnerService.hide()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => {
        if (response?.error) {
          this.#dialogService.openMessageModal(this.#translate.instant('common.errorTitle'), this.#translate.instant('errors.generic'));
          return;
        }

        const user = response?.data ?? this.#userService.getUser();
        if (!user?.isStaff()) {
          return;
        }
        this.#controlPanelExitService.clearOrganizationContext();
        this.openControlPanel.emit();
        this.#dialogData?.onOpenControlPanel();
      });
  }

  ngAfterViewInit(): void {
    if (!this.searchInput) {
      throw new Error('Search input reference is not available yet.');
    }
    fromEvent<InputEvent>(this.searchInput.nativeElement, 'input')
      .pipe(
        map((event: InputEvent) => {
          return (event.target as HTMLInputElement).value;
        }),
        filter(result => !this.loading && (result.length > 1 || result.length == 0)),
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((inputValue: string) => {
        this.searchBarFilter = inputValue;
        if (this.searchBarFilter !== this.#listSearch) {
          this.#requestListSearch(this.searchBarFilter);
        }
      });
    this.searchInput.nativeElement.focus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loading'] || changes['organizations']) {
      this.#cdr.markForCheck();
    }
  }

  onClearSearch(): void {
    this.searchBarFilter = '';
    this.inputValue = '';
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = '';
      this.searchInput.nativeElement.focus();
    }
    this.#requestListSearch('');
  }

  onEnterKeyPress(): void {
    const visibleOrganizations = this.visibleOrganizations();
    if (visibleOrganizations.length === 0) {
      return;
    }

    const firstAvailableOrganization = visibleOrganizations.find(org => !org.isDeleted());
    if (firstAvailableOrganization) {
      this.onSelectOrganization(firstAvailableOrganization);
    }
  }

  onInput(event: Event): void {
    this.inputValue = (event.target as HTMLInputElement).value;
  }

  onScroll(event: Event): void {
    if (this.showFavorites()) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.offsetHeight + target.scrollTop + 300 >= target.scrollHeight) {
      this.loadMoreOrganizations.emit();
      this.#dialogData?.onLoadMoreOrganizations();
    }
  }

  onSelectOrganization(organization: Organization): void {
    this.#organizationPreferencesService.recordVisit(organization.id);
    this.selectOrganization(organization.id);
  }

  @Input()
  get organizations(): Organization[] {
    return this.#organizations();
  }

  set organizations(organizations: Organization[]) {
    this.#organizations.set(organizations);
  }

  selectOrganization(organizationId: number): void {
    if (this.#dialogRef) {
      this.#dialogRef.close(organizationId);
      return;
    }
    this.selectedOrganization.emit(organizationId);
  }

  selectRecentOrganization(recentOrganization: Organization): void {
    this.onSelectOrganization(recentOrganization);
  }

  showDeletedOrganizations(checked: boolean): void {
    this.showDeleted = checked;
    this.showDeletedChanged.emit(this.showDeleted);
    this.#dialogData?.onShowDeletedChanged(this.showDeleted);
  }

  showFavoriteOrganizations(checked: boolean): void {
    this.showFavorites.set(checked);
    const search = this.#inputValue();
    if (!checked && search.length !== 1 && search !== this.#listSearch) {
      this.searchBarFilter = search;
      this.#requestListSearch(search);
    }
  }

  #computeShowControlPanelEntry(): boolean {
    const user = this.#userService.user ?? this.#userService.getUser();

    return (
      (this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.CONTROL_PANEL_VIEW,
        team: 'b2b-platform',
      }) ??
        false) &&
      (user?.isStaff() ?? false)
    );
  }

  #requestListSearch(search: string): void {
    if (this.showFavorites()) {
      return;
    }
    this.#listSearch = search;
    this.searchOrganization.emit(search);
    this.#dialogData?.onSearchOrganization(search);
  }

  #updateShowControlPanelEntry(): void {
    this.showControlPanelEntry.set(this.#computeShowControlPanelEntry());
  }
}
