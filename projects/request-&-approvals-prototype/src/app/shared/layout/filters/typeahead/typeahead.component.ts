import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { fromEvent, merge, NEVER, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, tap } from 'rxjs/operators';

import {
  ScreenTypeaheadInput,
  SelectOptionTypeaheadEvent,
  SelectOptionTypeaheadEventType,
  SelectOptionTypeaheadInput,
} from '../../../../core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { InputMobileBehaviorDirective } from '../../../directives/input-mobile-behavior/input-mobile-behavior.directive';
import { SelectDropdownPlanOption } from '../../../dropdown/select-dropdown-plan-option';
import { PlanStatus } from '../../../models/plan/plan-status.enum';
import { DualScreenStorageService } from '../../../services/dual-screen/dual-screen-storage.service';
import { PartnerConfigService } from '../../../services/partner-config/partner-config.service';
import { StringUtil } from '../../../utils/string/string.util';
import { SelectOption } from '../select/select.interface';
import { TypeaheadEvent } from './typeahead-event.model';

@Component({
  selector: 'app-typeahead',
  standalone: false,
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
})
export class TypeaheadComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  static readonly arrowUp = 'ArrowUp';
  static readonly debounceTime = 200;
  static readonly scrollThreshold = 100;
  static readonly selectAllOptionId = -1;
  static readonly createNewOptionId = -2;
  #attachScrollTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  #dropdownScrollListener: (() => void) | null = null;
  #spaceKeyListener: ((event: KeyboardEvent) => void) | null = null;
  #dualScreenStorageService = inject(DualScreenStorageService);
  #partnerConfigService = inject(PartnerConfigService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  #trackingService = inject(TrackingService);
  @Input() allowCreateNew = false;
  @ViewChild('instance') boostrapTypeaheadInstance!: NgbTypeahead;
  @Input() clean: Observable<void> | undefined;
  /**
   * Collapses an open popup when the control is clicked again, the select-like toggle every
   * `ngbDropdown`-based filter already has. Opt-in: by default a click never closes the popup
   * (only outside clicks and Escape do), preserving the historical behaviour of existing screens.
   *
   * Left without an initializer on purpose, like `clean` and `refreshTrigger`: an initialized field
   * is an own instance property, which `jest-preset-angular` prints as an attribute into the snapshot
   * of every subclass (`app-tier-typeahead` and friends), rewriting specs of unrelated modules.
   */
  @Input() collapseOnClick: boolean | undefined;
  @Input() createNewIcon: IconProp | null = null;
  @Input() createNewLabel = '';
  @Input() createNewMode: 'below-field' | 'dropdown' = 'dropdown';
  @Input() customOptionConfirmIcon: IconProp = ['far', 'arrow-right'];
  @Input() customOptionPlaceholder = '';
  @Input() createNewPattern: RegExp | null = null;
  @Input() createNewPatternError: string | null = null;
  @Output() createNewInitiated = new EventEmitter<void>();
  @Output() createNewSelected = new EventEmitter<string>();
  customOptionInput = '';
  customOptionInputError: string | null = null;
  @Input() helperText: string | null = null;
  isAddingCustomOption = false;
  @Input() customPopupClass = '';
  @Input() disabled = false;
  @Input() editable = true;
  @Input() emptyLabel = '';
  formatter: (searchInput: SelectOption | string) => string;
  @Input() floatingLabel = false;
  @Input() floatingLabelText = '';
  @Input() icon: IconProp = ['fas', 'chevron-down'];
  @Input() ignoreReadonlyPartnerConfig = false;
  @Input() inactiveLabel = 'INACTIVE';
  @Output() inputInteraction = new EventEmitter<string>();
  @ViewChild(InputMobileBehaviorDirective) inputMobileBehavior?: InputMobileBehaviorDirective;
  @Input() inputType: SelectOptionTypeaheadInput | undefined;
  @ViewChild('inputTypeahead') inputTypeahead!: ElementRef;
  isDualScreen: boolean = this.#dualScreenStorageService.containsData();
  isEditable: boolean = this.editable && !this.#paymentConfigStorageService.isMobilePos();
  @Input() minSearchLength = 4;
  model: SelectDropdownPlanOption | SelectOption | string | null | undefined;
  @Input({ transform: (options: (SelectOption | SelectDropdownPlanOption)[] | null | undefined) => options ?? [] })
  options: (SelectOption | SelectDropdownPlanOption)[] = [];
  @Input() preloadedOption: SelectDropdownPlanOption | SelectOption | string | undefined;
  previousModel: SelectDropdownPlanOption | SelectOption | string | null | undefined;
  /**
   * Makes `refreshTrigger` a no-op while the popup is closed. Opt-in (and initializer-free for the
   * reason given on `collapseOnClick`): by default a refresh reaches the popup either way, which
   * means a late option load pops a closed dropdown open — what the screens refreshing after their
   * ambient loads have always done. Screens whose options load in the background want the opposite.
   */
  @Input() refreshOnlyWhenOpen: boolean | undefined;
  @Input() refreshTrigger: Observable<void> | undefined;
  @Input() screen: ScreenTypeaheadInput | undefined;
  @Output() editOptionClicked = new EventEmitter<SelectOption>();
  @Output() scrollToEnd = new EventEmitter<void>();
  search: (text$: Observable<string>) => Observable<SelectOption[]>;
  @Input() selectAllLabel: string | undefined;
  selectAllOption: SelectOption | SelectDropdownPlanOption | undefined;
  @Output() selected = new EventEmitter<SelectOption | SelectDropdownPlanOption>();
  @Input() selectedOption: SelectDropdownPlanOption | SelectOption | undefined;
  selectEventType: SelectOptionTypeaheadEventType | undefined;
  showAll = false;
  showAllSubject = new Subject<void>();
  @Input() showId = false;
  termTyped = '';
  @Input() useIdInSearch = false;
  @Output() userInteraction = new EventEmitter<TypeaheadEvent>();

  readonly #normalizedTitleCache = new WeakMap<SelectOption | SelectDropdownPlanOption, string>();

  constructor() {
    this.formatter = (searchInput: SelectOption | string): string => {
      if (typeof searchInput === 'string') {
        return searchInput;
      }
      const title = searchInput.titleTranslated ?? searchInput.title;
      if (
        this.showId &&
        searchInput.id !== TypeaheadComponent.selectAllOptionId &&
        searchInput.id !== TypeaheadComponent.createNewOptionId
      ) {
        return `(${searchInput.id}) ${title}`;
      }
      return title;
    };
    this.search = (text$: Observable<string>) => {
      const debouncedText$ = text$.pipe(
        debounceTime(TypeaheadComponent.debounceTime),
        distinctUntilChanged(),
        tap(() => (this.showAll = false)),
      );
      const showAllSubject = this.showAllSubject.pipe(
        filter(() => !this.boostrapTypeaheadInstance.isPopupOpen() && !this.disabled),
        tap(() => (this.showAll = typeof this.model === 'object' || !this.model)),
      );

      const refreshTrigger$ =
        this.refreshTrigger?.pipe(
          // Emitting results while the popup is closed OPENS it (any non-empty emission of the ngb
          // search stream does), so a late option load pops the dropdown up unprompted. Screens that
          // do not want that opt in through `refreshOnlyWhenOpen` and keep the refresh for the popup
          // the user is actually looking at.
          filter(() => this.refreshOnlyWhenOpen !== true || this.boostrapTypeaheadInstance.isPopupOpen()),
          tap(() => {
            this.showAll = true;
            // Reattach scroll listener after options update
            this.#reattachScrollListenerAfterOptionsUpdate();
          }),
        ) ?? NEVER;

      return merge(debouncedText$, showAllSubject, refreshTrigger$).pipe(
        takeUntilDestroyed(this.#destroyRef),
        map(term => {
          this.termTyped = (term as string) ?? '';
          let results = this.showAll ? this.options : this.#getFilterList();

          if (this.allowCreateNew && this.showAll) {
            const hasCreateNew = results.some(r => (r as SelectOption).id === TypeaheadComponent.createNewOptionId);
            if (!hasCreateNew) {
              const createNewOption: SelectOption = {
                id: TypeaheadComponent.createNewOptionId,
                title: this.createNewLabel,
              };
              results = [createNewOption, ...results];
            }
          }

          return results;
        }),
      );
    };
  }

  getOptionClass(option: SelectDropdownPlanOption | SelectOption): string {
    if (this.isLoadingOption(option)) {
      return 'dropdown-item--loading';
    }
    const selectedAllClassName = 'dropdown-item--selected-all';
    const selectedClassName = 'dropdown-item--selected';
    let optionClass = `dropdown-item--${option.status ? option.status : 'active'}`;
    if (!this.model || this.isSelectAllOption(this.model)) {
      if (this.isSelectAllOption(option)) {
        optionClass = `${optionClass} ${selectedAllClassName}`;
      }
    }
    if (
      this.model &&
      (((this.model as SelectOption).id && (this.model as SelectOption).id === option.id) || !(this.model as SelectOption).id)
    ) {
      optionClass = `${optionClass} ${selectedClassName}`;
    }
    return optionClass;
  }

  isSelectAllOption(model: SelectOption | string | null | undefined): boolean {
    return model != null && (model as SelectOption).id && (model as SelectOption).id === TypeaheadComponent.selectAllOptionId;
  }

  hasValue(): boolean {
    if (!this.model) return false;
    const displayValue = this.formatter(this.model);
    return displayValue.trim().length > 0;
  }

  protected get placeholderLabel(): string {
    if (this.emptyLabel.length > 0) {
      return this.emptyLabel;
    }
    return this.selectAllLabel ?? '';
  }

  ngAfterViewInit(): void {
    fromEvent(this.inputTypeahead.nativeElement, 'input')
      .pipe(
        map((event: any) => {
          return event.target.value;
        }),
        filter(result => result.length >= this.minSearchLength || result.length === 0),
        debounceTime(500),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((inputValue: string) => {
        this.inputInteraction.emit(inputValue.trim());
      });

    this.#setupDropdownScrollListener();
    this.#setupSpaceKeyListener();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.preloadedOption && changes.preloadedOption.currentValue) {
      this.model = changes.preloadedOption.currentValue;
    }
    if (changes.options) {
      if (this.selectAllLabel && this.options[0]?.id != TypeaheadComponent.selectAllOptionId) {
        this.selectAllOption = {
          id: TypeaheadComponent.selectAllOptionId,
          title: this.selectAllLabel,
          status: PlanStatus.ON_SALE,
        };
        this.options.unshift(this.selectAllOption);
      }
    }
    if (changes.selectedOption) {
      this.model = changes.selectedOption.currentValue;
    }
  }

  ngOnDestroy(): void {
    this.#cleanupDropdownScrollListener();
    this.#clearAttachScrollTimeout();
    this.#cleanupSpaceKeyListener();
  }

  ngOnInit(): void {
    this.#setIsEditable();

    if (this.clean) {
      this.clean.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.model = undefined;
        this.#changeDetectorRef.detectChanges();
      });
    }
    if (this.selectAllLabel) {
      this.selectAllOption = {
        id: TypeaheadComponent.selectAllOptionId,
        title: this.selectAllLabel,
        status: PlanStatus.ON_SALE,
      };
    }
  }

  onClickIcon(event: PointerEvent): void {
    this.userInteraction.emit(new TypeaheadEvent(this.#getModel() as SelectOption, event));
    // Clicking the control while its popup is open collapses it, like any select does. Dismissing
    // (rather than selecting) mirrors what Escape and clicking outside already do. Opt-in, so
    // screens that rely on the historical open-only behaviour are untouched.
    if (this.collapseOnClick === true && this.boostrapTypeaheadInstance.isPopupOpen()) {
      this.boostrapTypeaheadInstance.dismissPopup();
      return;
    }
    this.inputTypeahead.nativeElement.focus();
    this.showAllSubject.next();
    // A toggle-close keeps the input focused, so reopening happens without the 'focus' event that
    // normally arms the scroll-paging listener — arm it from here too (attaching twice is safe,
    // `#attachDropdownScrollListener` always detaches the previous listener first).
    if (this.collapseOnClick === true) {
      this.#tryAttachScrollListener();
    }
  }

  onClickInput(): void {
    if (this.collapseOnClick === true && this.boostrapTypeaheadInstance.isPopupOpen()) {
      this.boostrapTypeaheadInstance.dismissPopup();
      return;
    }
    if (this.selectAllLabel && this.model === this.options[0]) {
      this.inputTypeahead.nativeElement.value = '';
    } else {
      if (this.isEditable) {
        this.inputTypeahead.nativeElement.select();
      }
    }
    this.showAllSubject.next();
    if (this.collapseOnClick === true) {
      this.#tryAttachScrollListener();
    }
  }

  onClickSelectOption(): void {
    this.selectEventType = SelectOptionTypeaheadEventType.click;
  }

  onEnter(event: KeyboardEvent): void {
    this.userInteraction.emit(new TypeaheadEvent(this.#getModel() as SelectOption, event));
  }

  onFocusOutEvent(event: FocusEvent): void {
    this.userInteraction.emit(new TypeaheadEvent(this.#getModel() as SelectOption, event));
    setTimeout(() => {
      if (this.#document.activeElement instanceof HTMLIFrameElement && this.boostrapTypeaheadInstance?.isPopupOpen()) {
        this.boostrapTypeaheadInstance.dismissPopup();
      }
    });
  }

  onPressArrow(event: KeyboardEvent): void {
    this.showAllSubject.next();
    this.#scrollToElement(event);
  }

  isDisabledOption(option: SelectOption | SelectDropdownPlanOption): boolean {
    return Boolean((option as SelectOption).disabled);
  }

  onEditOptionClick(event: MouseEvent, option: SelectOption): void {
    event.preventDefault();
    event.stopPropagation();
    // The action of an enabled option opens something over the field, so the popup gets out of the
    // way. A disabled row keeps the historical behaviour of leaving it open.
    if (!this.isDisabledOption(option)) {
      this.boostrapTypeaheadInstance.dismissPopup();
    }
    this.editOptionClicked.emit(option);
  }

  onSelectItem(event: { item: SelectOption; preventDefault: any }): void {
    if (event.item.isGroupHeader) {
      event.preventDefault();
      return;
    }

    if (this.isLoadingOption(event.item)) {
      event.preventDefault();
      return;
    }

    if (this.isDisabledOption(event.item)) {
      event.preventDefault();
      return;
    }

    if (this.isCreateNewOption(event.item)) {
      event.preventDefault();
      this.#initiateCreateNew();
      return;
    }

    this.#sendMixpanelEvent(event);
    this.previousModel = this.model;
    this.model = this.isSelectAllOption(event.item) ? undefined : event.item;
    if (this.previousModel !== this.model) {
      this.selected.emit(this.#getModel() as SelectOption);
    }
    if (this.isDualScreen) {
      this.inputMobileBehavior?.onEnter();
    }
  }

  #attachDropdownScrollListener(dropdown: HTMLElement): void {
    this.#cleanupDropdownScrollListener();

    const scrollHandler = (): void => {
      const { scrollTop, scrollHeight, clientHeight } = dropdown;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom <= TypeaheadComponent.scrollThreshold) {
        this.scrollToEnd.emit();
      }
    };

    dropdown.addEventListener('scroll', scrollHandler);
    this.#dropdownScrollListener = () => dropdown.removeEventListener('scroll', scrollHandler);
  }

  #clearAttachScrollTimeout(): void {
    if (this.#attachScrollTimeoutId !== null) {
      clearTimeout(this.#attachScrollTimeoutId);
      this.#attachScrollTimeoutId = null;
    }
  }

  #cleanupDropdownScrollListener(): void {
    if (this.#dropdownScrollListener) {
      this.#dropdownScrollListener();
      this.#dropdownScrollListener = null;
    }
  }

  #getFilterList(): SelectOption[] {
    const isEmptyString = typeof this.model === 'string' && !this.model.trim();
    const isSelectOption = this.model != null && typeof this.model === 'object' && (this.model as SelectOption).title;

    if (this.model == null || isEmptyString || isSelectOption) {
      if (this.allowCreateNew) {
        const createNewOption: SelectOption = {
          id: TypeaheadComponent.createNewOptionId,
          title: this.createNewLabel,
        };
        return [createNewOption];
      }
      return [];
    }
    const modelNormalize = StringUtil.normalizeString((this.model as string).toLowerCase().trim());
    const filterOptions = this.options.filter(option => {
      if (this.useIdInSearch && option.id.toString().indexOf(modelNormalize) > -1) {
        return true;
      }
      return (
        option.id !== TypeaheadComponent.selectAllOptionId &&
        option.id !== TypeaheadComponent.createNewOptionId &&
        this.#getNormalizedTitle(option).indexOf(modelNormalize) > -1
      );
    });
    const hasMatches = filterOptions.length > 0;

    if (this.selectAllLabel && this.selectAllOption !== undefined) {
      filterOptions.unshift(this.selectAllOption);
    }

    if (this.allowCreateNew) {
      const termTypedTrimmed = this.termTyped?.trim() ?? '';
      const createNewOption: SelectOption = {
        id: TypeaheadComponent.createNewOptionId,
        title: hasMatches ? this.createNewLabel : termTypedTrimmed ? `${this.createNewLabel}: ${termTypedTrimmed}` : this.createNewLabel,
      };
      filterOptions.unshift(createNewOption);
    }
    return filterOptions;
  }

  #getNormalizedTitle(option: SelectOption | SelectDropdownPlanOption): string {
    const cached = this.#normalizedTitleCache.get(option);
    if (cached !== undefined) {
      return cached;
    }
    const title = option.titleTranslated ?? option.title;
    const normalized = StringUtil.normalizeString(title.toLowerCase());
    this.#normalizedTitleCache.set(option, normalized);
    return normalized;
  }

  #getFocusElement(key: string, activeElement: Element, nextElementSibling: Element): Element {
    const activeDropdownElement: Element | null =
      key === TypeaheadComponent.arrowUp ? activeElement.previousElementSibling : activeElement.nextElementSibling;
    if (activeDropdownElement !== null) {
      return activeDropdownElement;
    }
    const allDropdownElements: NodeListOf<Element> = nextElementSibling.querySelectorAll('.dropdown-item');
    const position: number = key === TypeaheadComponent.arrowUp ? allDropdownElements.length - 1 : 0;
    return allDropdownElements[position];
  }

  #getModel(): SelectOption | string | null | undefined {
    return this.isSelectAllOption(this.model) ? undefined : this.model;
  }

  cancelCustomOption(): void {
    this.isAddingCustomOption = false;
    this.customOptionInput = '';
    this.customOptionInputError = null;
    this.#restoreDismissPopup();
    this.boostrapTypeaheadInstance.dismissPopup();
    this.#changeDetectorRef.detectChanges();
    setTimeout(() => {
      this.inputTypeahead.nativeElement.focus();
    }, 0);
  }

  confirmCustomOption(): void {
    const optionName = this.customOptionInput.trim();
    if (!optionName) {
      return;
    }

    if (this.createNewPattern && !this.createNewPattern.test(optionName)) {
      this.customOptionInputError = this.createNewPatternError || 'Invalid format';
      this.#changeDetectorRef.detectChanges();
      return;
    }

    this.customOptionInputError = null;
    this.createNewSelected.emit(optionName);
    this.isAddingCustomOption = false;
    this.customOptionInput = '';
    this.#restoreDismissPopup();
    this.boostrapTypeaheadInstance.dismissPopup();
    this.#changeDetectorRef.detectChanges();
  }

  handleCreateNewClick(event: MouseEvent): void {
    this.#preventEventPropagation(event);
    this.#initiateCreateNew();
  }

  #initiateCreateNew(): void {
    if (this.createNewMode === 'below-field') {
      this.boostrapTypeaheadInstance.dismissPopup();
      this.createNewInitiated.emit();
      this.#changeDetectorRef.detectChanges();
      return;
    }

    this.#startCustomOptionCreation();
  }

  isCreateNewOption(model: SelectOption | string | null | undefined): boolean {
    return model != null && typeof model === 'object' && (model as SelectOption).id === TypeaheadComponent.createNewOptionId;
  }

  isLoadingOption(option: SelectDropdownPlanOption | SelectOption | string | null | undefined): boolean {
    return Boolean(option && typeof option === 'object' && (option as SelectOption).isLoadingOption);
  }

  #cleanupSpaceKeyListener(): void {
    if (this.#spaceKeyListener) {
      document.removeEventListener('keydown', this.#spaceKeyListener, { capture: true });
      this.#spaceKeyListener = null;
    }
  }

  #isElementInViewport(element: Element, inputElement: any): boolean {
    const elementDOMRect = element.getBoundingClientRect();
    const inputElementDOMRect = inputElement.getBoundingClientRect();
    return (
      elementDOMRect.top >= inputElementDOMRect.bottom &&
      elementDOMRect.left >= 0 &&
      elementDOMRect.bottom <= inputElementDOMRect.bottom + elementDOMRect.height &&
      elementDOMRect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  #overrideDismissPopup(): void {
    const instance = this.boostrapTypeaheadInstance as NgbTypeahead & { _originalDismissPopup?: () => void };

    if (instance._originalDismissPopup) {
      return;
    }

    instance._originalDismissPopup = instance.dismissPopup.bind(instance);
    instance.dismissPopup = (): void => {
      if (this.isAddingCustomOption) {
        const customInput = document.querySelector(
          '.custom-option-input-injected, [data-testid="custom-option-input"]',
        ) as HTMLInputElement;

        if (customInput && document.activeElement === customInput) {
          return;
        }
      }

      instance._originalDismissPopup!();
    };
  }

  #preventEventPropagation(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  handleCustomInputSpace(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const input = event.target as HTMLInputElement;
    if (!input) {
      return;
    }

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const newValue = input.value.substring(0, start) + ' ' + input.value.substring(end);

    this.customOptionInput = newValue;
    this.#changeDetectorRef.detectChanges();

    setTimeout(() => {
      input.setSelectionRange(start + 1, start + 1);
    }, 0);
  }

  #restoreDismissPopup(): void {
    const instance = this.boostrapTypeaheadInstance as NgbTypeahead & { _originalDismissPopup?: () => void };

    if (instance._originalDismissPopup) {
      instance.dismissPopup = instance._originalDismissPopup;
      delete instance._originalDismissPopup;
    }
  }

  #setupSpaceKeyListener(): void {
    this.#cleanupSpaceKeyListener();

    this.#spaceKeyListener = (event: KeyboardEvent): void => {
      if (event.key !== ' ' && event.code !== 'Space') {
        return;
      }

      const target = event.target as HTMLElement;
      const isCustomInput =
        target?.classList?.contains('custom-option-input-injected') || target?.getAttribute('data-testid') === 'custom-option-input';

      if (isCustomInput) {
        return;
      }

      if (this.isAddingCustomOption && event.target === this.inputTypeahead?.nativeElement) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    document.addEventListener('keydown', this.#spaceKeyListener, { capture: true });
  }

  #startCustomOptionCreation(): void {
    this.isAddingCustomOption = true;
    this.customOptionInput = this.termTyped?.trim() ?? '';
    this.#overrideDismissPopup();
    this.#changeDetectorRef.detectChanges();
  }

  #scrollToElement(event: KeyboardEvent): void {
    const eventTarget: HTMLInputElement | null = event.target as HTMLInputElement;
    if (eventTarget === null) {
      return;
    }
    const nextElementSibling: Element | null = eventTarget.nextElementSibling;
    if (nextElementSibling === null) {
      return;
    }
    const activeElement: Element | null = nextElementSibling.querySelector('.active');
    if (activeElement === null) {
      return;
    }
    const activeDropdownElement: Element = this.#getFocusElement(event.key, activeElement, nextElementSibling);
    if (!this.#isElementInViewport(activeDropdownElement, event.target)) {
      const focus: boolean = event.key === TypeaheadComponent.arrowUp;
      activeDropdownElement.scrollIntoView(focus);
    }
  }

  #sendMixpanelEvent(event: { item: SelectOption; preventDefault: any }): void {
    const mixpanelEvent = {
      selectedOption: event.item.title,
      typed: this.termTyped ? this.termTyped : '',
      event: this.selectEventType ? this.selectEventType : SelectOptionTypeaheadEventType.enter,
      inputType: this.inputType,
      screen: this.screen,
    };
    this.#trackingService.track(new SelectOptionTypeaheadEvent(mixpanelEvent));
    this.termTyped = '';
    this.selectEventType = undefined;
  }

  #setIsEditable(): void {
    this.isEditable = this.editable && !this.#paymentConfigStorageService.isMobilePos();
    if (!this.ignoreReadonlyPartnerConfig) {
      this.isEditable = this.isEditable && !this.#partnerConfigService.config?.ui?.deactivateEditableTypeahead;
    }
  }

  #setupDropdownScrollListener(): void {
    this.boostrapTypeaheadInstance.selectItem.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#cleanupDropdownScrollListener();
    });

    fromEvent(this.inputTypeahead.nativeElement, 'focus')
      .pipe(debounceTime(100), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#tryAttachScrollListener();
      });

    fromEvent(this.inputTypeahead.nativeElement, 'blur')
      .pipe(debounceTime(200), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#cleanupDropdownScrollListener();

        if (!this.boostrapTypeaheadInstance.isPopupOpen() && this.isAddingCustomOption) {
          const customInput = document.querySelector(
            '.custom-option-input-injected, [data-testid="custom-option-input"]',
          ) as HTMLInputElement;
          if (!customInput || document.activeElement !== customInput) {
            this.isAddingCustomOption = false;
            this.customOptionInput = '';
            this.customOptionInputError = null;
          }
        }
      });
  }

  #findDropdownElement(): HTMLElement | null {
    const nextSibling = this.inputTypeahead.nativeElement.nextElementSibling;
    if (nextSibling && nextSibling.classList.contains('dropdown-menu')) {
      return nextSibling as HTMLElement;
    }
    // With `container="body"` the popup is not a sibling of the input: `NgbTypeahead` appends it to
    // `<body>`, identified by the id it assigns. Without this lookup, scroll paging (`scrollToEnd`)
    // silently never fires for body-attached popups.
    const bodyPopup = document.getElementById(this.boostrapTypeaheadInstance.popupId);
    if (bodyPopup !== null && bodyPopup.classList.contains('dropdown-menu')) {
      return bodyPopup;
    }
    return null;
  }

  #tryAttachScrollListener(): void {
    this.#clearAttachScrollTimeout();

    this.#attachScrollTimeoutId = setTimeout(() => {
      this.#attachScrollTimeoutId = null;
      if (this.boostrapTypeaheadInstance.isPopupOpen()) {
        const dropdown = this.#findDropdownElement();
        if (dropdown) {
          this.#attachDropdownScrollListener(dropdown);
        }
      }
    }, 100);
  }

  #reattachScrollListenerAfterOptionsUpdate(): void {
    // Wait for Angular to update the DOM with new options
    this.#clearAttachScrollTimeout();
    this.#attachScrollTimeoutId = setTimeout(() => {
      this.#attachScrollTimeoutId = null;
      if (this.boostrapTypeaheadInstance.isPopupOpen()) {
        const dropdown = this.#findDropdownElement();
        if (dropdown) {
          this.#attachDropdownScrollListener(dropdown);
        }
      }
    }, 50);
  }
}
