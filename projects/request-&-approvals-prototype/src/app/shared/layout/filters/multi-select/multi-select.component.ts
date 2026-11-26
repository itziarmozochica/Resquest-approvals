import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  booleanAttribute,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  OnChanges,
  OnInit,
  output,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, fromEvent } from 'rxjs';

import { SelectDropdownPlanOption } from '../../../dropdown/select-dropdown-plan-option';
import { StringUtil } from '../../../utils/string/string.util';
import { SelectOption } from '../select/select.interface';
import {
  MultiSelectCustomOptionAsyncEvent,
  MultiSelectCustomOptionAsyncState,
  MultiSelectCustomOptionI18n,
} from './multi-select-custom-option.model';
import { MultiSelectExclusiveGroupMember } from './multi-select-exclusive-group.model';
import { MULTI_SELECT_EXCLUSIVE_GROUP } from './multi-select-exclusive-group.token';

type Option = SelectOption | SelectDropdownPlanOption;

@Component({
  host: { '(window:blur)': 'onFocusLeave()' },
  selector: 'app-multi-select',
  standalone: false,
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.scss'],
})
export class MultiSelectComponent implements OnInit, OnChanges, AfterViewInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  readonly #exclusiveGroup = inject(MULTI_SELECT_EXCLUSIVE_GROUP, { optional: true });
  readonly #exclusiveGroupMember: MultiSelectExclusiveGroupMember = {
    close: (): void => this.closeDropdown(),
    isOpen: (): boolean => this.#isDropdownOpen(),
  };
  readonly #interactiveTargetSelector = 'a, button, input, label, select, textarea';
  #suppressSelectionEmitOnClose = false;

  @Input() allowCustomOption = false;
  @Input() container: 'body' | null = null;
  /**
   * When non-null, async custom-option flow: parent drives {@link MultiSelectCustomOptionAsyncState} and
   * listens to {@link customOptionAsyncEvent}. Prefer replacing the object when updating state.
   */
  @Input() customOptionAsync: MultiSelectCustomOptionAsyncState | null = null;
  @Output() customDeselected = new EventEmitter<void>();
  @Output() customOptionAsyncEvent = new EventEmitter<MultiSelectCustomOptionAsyncEvent>();
  customOptionInput = '';
  @ViewChild('customOptionInputRef') customOptionInputRef!: ElementRef<HTMLInputElement>;
  @Input() customOptions: Option[] = [];
  /**
   * When set, overrides default custom-option copy via `baseKey + '.label'` (button) and `baseKey + '.placeholder'`
   * translation keys.
   */
  @Input() customOptionI18n: MultiSelectCustomOptionI18n | null = null;
  customOptionsAdded: Option[] = [];
  @Input() defaultOpening = false;
  @Input() defaultOrdering = true;
  @Input() disabled = false;
  displayedOptions: Option[] = [];
  @Input() displayInPlaceMaximum: number | null = null;
  @Input() errorMessage: string | null = null;
  readonly fieldLabel = input<string | null>(null);
  readonly footerTemplate = input<TemplateRef<unknown> | null>(null);
  readonly headerTemplate = input<TemplateRef<unknown> | null>(null);
  readonly readonly = input(false, { transform: booleanAttribute });
  @Input() helpText: string | null = null;
  isAddingCustomOption = false;
  @Input() isSelectAllFixHeight = true;
  @Input() isSelectAllVisible = false;
  @Input() maxSelectedOptions: number | null = null;
  @Input() blockAtMax = false;
  model: string | SelectOption = '';
  @ViewChild('multiSelectDropdown') multiSelectDropdown!: NgbDropdown;
  @ViewChild('scrollWrapper') scrollWrapper!: ElementRef<HTMLElement>;
  optionBadgeTemplate = input<TemplateRef<unknown> | null>(null);
  optionTemplate = input<TemplateRef<unknown> | null>(null);
  @Input() options: Option[] = [];
  @Input() placeholder: string | null = null;
  @Output() scrollEnd = new EventEmitter<void>();
  @Input() scrollEndEnabled = false;
  @Input() scrollEndThreshold = 100;
  @Output() searchChange = new EventEmitter<string>();
  @Input() searchPlaceholder: string | null = null;
  @Output() selected = new EventEmitter<Array<Option>>();
  /** Emitted by {@link selectAll} immediately before {@link selected}, so a consumer can tell the two apart. */
  readonly selectedAll = output<void>();
  @Input() selectedOptions: Option[] = [];
  /** When set, replaces the comma-separated list of selected titles with this text (e.g. "3 activities selected"). */
  @Input() selectedSummaryText: string | null = null;
  /**
   * @todo Remove this once the feature flag is enabled for all users
   */
  @Input() showAllSelectedOnFeatureToggle = false;
  @Input() showId = false;
  @Input() showItemsDescriptions = false;
  @Input() useDescriptionInSearch = false;
  @Input() useIdInSearch = false;

  readonly #normalizedTitleCache = new WeakMap<Option, string>();

  onFocusLeave(): void {
    if (!this.multiSelectDropdown?.isOpen()) {
      return;
    }

    setTimeout(() => {
      if (this.#document.activeElement instanceof HTMLIFrameElement && this.multiSelectDropdown?.isOpen()) {
        this.closeDropdown();
      }
    });
  }

  closeDropdown(options?: { emitSelection?: boolean }): void {
    const dropdown = this.multiSelectDropdown;
    if (!dropdown) {
      return;
    }
    const shouldEmitSelection = options?.emitSelection !== false;
    if (!shouldEmitSelection && dropdown.isOpen()) {
      this.#suppressSelectionEmitOnClose = true;
    }
    dropdown.close();
  }

  cancelCustomOption(): void {
    this.isAddingCustomOption = false;
    this.customOptionInput = '';
    if (this.#isAsyncCustomOption()) {
      this.customOptionAsyncEvent.emit({ action: 'reset' });
    }
  }

  #commitAddedCustomOption(newCustomOption: SelectOption): void {
    this.customOptionsAdded.unshift(newCustomOption);
    this.selectedOptions.push(newCustomOption);
    this.isAddingCustomOption = false;
    this.customOptionInput = '';
    this.getFilterList();
    this.selected.emit(this.selectedOptions as SelectOption[]);
  }

  confirmCustomOption(): void {
    const trimmed = this.customOptionInput.trim();
    const asyncState = this.customOptionAsync;
    if (!trimmed || (asyncState != null && asyncState.pending)) {
      return;
    }

    if (asyncState != null) {
      this.customOptionAsyncEvent.emit({ action: 'confirm', name: trimmed });
      return;
    }

    const newCustomOption: SelectOption = {
      id: trimmed,
      title: trimmed,
    };
    this.#commitAddedCustomOption(newCustomOption);
  }

  confirmSelection(): void {
    this.selected.emit(this.selectedOptions as SelectOption[]);
    this.model = '';
    this.getFilterList();
    this.reorderOptions();
  }

  forceConfirmSelection(): void {
    this.confirmSelection();
  }

  formatter(option: Option): string {
    const title = option.titleTranslated ?? option.title;
    if (this.showId) {
      return `(${option.id}) ${title}`;
    }
    return title;
  }

  getFilterList(): void {
    const allOptions = [...this.options];

    if (this.allowCustomOption) {
      allOptions.push(...this.customOptions);
      this.customOptionsAdded.forEach(customOption => {
        if (!allOptions.some(option => option.id === customOption.id)) {
          allOptions.push(customOption);
        }
      });
    }

    const searchTerm = (this.model as string).trim();
    const modelNormalize = StringUtil.normalizeString(searchTerm.toLowerCase());
    this.displayedOptions = allOptions.filter(option => {
      if (this.useIdInSearch && option.id.toString().indexOf(modelNormalize) > -1) {
        return true;
      }
      if (
        this.useDescriptionInSearch &&
        option.description &&
        StringUtil.normalizeString(option.description.toLowerCase()).includes(modelNormalize)
      ) {
        return true;
      }
      return this.#getNormalizedTitle(option).indexOf(modelNormalize) > -1;
    });

    if (this.model && !this.multiSelectDropdown.isOpen()) {
      this.multiSelectDropdown.open();
    }
  }

  getOptionClass(option: SelectOption): string {
    return `dropdown-item--${option.status ? option.status : 'active'}`;
  }

  isAllItemsSelected(): boolean {
    const selectableOptions = this.displayedOptions.filter(option => !option.disabled);
    if (selectableOptions.length === 0) {
      return false;
    }
    if (this.maxSelectedOptions !== null && this.selectedOptions.length >= this.maxSelectedOptions) {
      return true;
    }

    const selectedOptionIds = new Set(this.selectedOptions.map(selectedOption => selectedOption.id));
    return selectableOptions.every(option => selectedOptionIds.has(option.id));
  }

  isSelectedOption(option: SelectOption): boolean {
    return this.selectedOptions?.some(selectedOption => selectedOption.id === option.id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const optionsChanged =
      changes.options && changes.options.previousValue != undefined && changes.options.previousValue != changes.options.currentValue;

    const customOptionsChanged =
      changes.customOptions &&
      changes.customOptions.previousValue != undefined &&
      changes.customOptions.previousValue != changes.customOptions.currentValue;

    if (optionsChanged || customOptionsChanged) {
      this.getFilterList();
    }

    if (changes['customOptionAsync']) {
      const prev = changes['customOptionAsync'].previousValue as MultiSelectCustomOptionAsyncState | null | undefined;
      const curr = changes['customOptionAsync'].currentValue as MultiSelectCustomOptionAsyncState | null | undefined;
      if (curr != null && prev?.pending === true && curr.pending === false && !curr.errorMessage) {
        this.#onAsyncCustomOptionCompletedSuccessfully();
      }
    }
  }

  ngAfterViewInit(): void {
    this.#setupScrollListener();
  }

  ngOnInit(): void {
    this.getFilterList();
    this.reorderOptions();
    this.#exclusiveGroup?.register(this.#exclusiveGroupMember);
    this.#destroyRef.onDestroy(() => this.#exclusiveGroup?.unregister(this.#exclusiveGroupMember));
  }

  onMenuClick(event: MouseEvent): void {
    // The host is a <label> whose labelled control is the toggle input: a click on non-interactive
    // panel content would activate the label, click that input and close the panel.
    const { currentTarget, target } = event;
    if (!(currentTarget instanceof Element) || !(target instanceof Element)) {
      return;
    }

    const interactiveTarget = target.closest(this.#interactiveTargetSelector);
    if (interactiveTarget === null || !currentTarget.contains(interactiveTarget)) {
      event.preventDefault();
    }
  }

  onDropdownOpenChange($onChangeEvent: boolean): void {
    // Refusing the panel is not enough: the close it causes would confirm a selection nobody made.
    if (this.readonly()) {
      if ($onChangeEvent === true) {
        this.multiSelectDropdown.close();
      }

      return;
    }

    if ($onChangeEvent === true) {
      this.#suppressSelectionEmitOnClose = false;
      this.#exclusiveGroup?.notifyOpened(this.#exclusiveGroupMember);
      return;
    }
    if (this.#isDropdownClose($onChangeEvent)) {
      const skipConfirmSelection = this.#suppressSelectionEmitOnClose;
      this.#suppressSelectionEmitOnClose = false;
      if (!skipConfirmSelection) {
        this.confirmSelection();
      }
      this.#clearCustomOptions();
    }
  }

  onSearchInputChange(): void {
    this.getFilterList();
    const searchTerm = (this.model as string).trim();
    this.searchChange.emit(searchTerm);
  }

  reorderOptions(): void {
    if (!this.defaultOrdering) {
      return;
    }

    this.displayedOptions.sort((a, b) => a.title.localeCompare(b.title));

    this.displayedOptions.sort((a, b) => {
      if (this.selectedOptions.find(option => option.id == a.id)) {
        return -1;
      }
      return this.selectedOptions.find(option => option.id == b.id) ? 1 : 0;
    });
  }

  selectAll(): void {
    const selectableOptions = this.displayedOptions.filter(option => !this.isOptionDisabled(option));

    /**
     * With nothing to select there is nothing to do. Falling through would assign and emit an empty
     * array, wiping a selection the user cannot even see — a search matching only disabled rows was
     * enough to trigger it. "Select all" clearing the selection is never what it means.
     */
    if (selectableOptions.length === 0) {
      return;
    }

    this.selectedOptions = this.maxSelectedOptions === null ? selectableOptions : selectableOptions.slice(0, this.maxSelectedOptions);
    this.selectedAll.emit();
    this.selected.emit(this.selectedOptions as SelectOption[]);
  }

  selectOption(option: Option): void {
    const selectedOption: Option | undefined = this.selectedOptions.find(selectedOption => selectedOption.id === option.id);
    const isDeselecting = selectedOption !== undefined;
    const isCustomOption = this.allowCustomOption && this.customOptions.some(customOption => customOption.id === option.id);

    if (selectedOption !== undefined) {
      const index = this.selectedOptions.indexOf(selectedOption, 0);
      if (index > -1) {
        this.selectedOptions.splice(index, 1);
      }
    } else {
      this.selectedOptions.push(option);
    }

    if (this.maxSelectedOptions != null) {
      if (this.maxSelectedOptions < this.selectedOptions.length) {
        this.selectedOptions.shift();
      }
    }

    if (!isDeselecting || !isCustomOption) {
      this.selected.emit(this.selectedOptions as SelectOption[]);

      if (this.maxSelectedOptions === 1 && !isDeselecting && this.multiSelectDropdown.isOpen()) {
        queueMicrotask(() => {
          this.multiSelectDropdown.close();
        });
      }
    } else if (isDeselecting && isCustomOption) {
      this.customDeselected.emit();
    }
  }

  shouldRenderOptionIcon(): boolean {
    if (this.maxSelectedOptions === null) {
      return true;
    }
    return this.maxSelectedOptions > 1;
  }

  isOptionDisabled(option: Option): boolean {
    if (option.disabled) {
      return true;
    }
    if (!this.blockAtMax || this.maxSelectedOptions === null) {
      return false;
    }
    return this.selectedOptions.length >= this.maxSelectedOptions && !this.isSelectedOption(option);
  }

  startAddingCustomOption(): void {
    this.isAddingCustomOption = true;
    this.customOptionInput = '';
    if (this.#isAsyncCustomOption()) {
      this.customOptionAsyncEvent.emit({ action: 'reset' });
    }
    setTimeout(() => {
      this.customOptionInputRef?.nativeElement.focus();
    }, 0);
  }

  unselectAll(): void {
    this.selectedOptions = [];
    this.selected.emit(this.selectedOptions as SelectOption[]);
  }

  #getNormalizedTitle(option: Option): string {
    const cached = this.#normalizedTitleCache.get(option);
    if (cached !== undefined) {
      return cached;
    }
    const normalized = StringUtil.normalizeString(option.title.toLowerCase());
    this.#normalizedTitleCache.set(option, normalized);
    return normalized;
  }

  #clearCustomOptions(): void {
    this.customOptionsAdded = [];
    this.cancelCustomOption();
  }

  #isDropdownClose($onChangeEvent: boolean): boolean {
    return $onChangeEvent === false;
  }

  #isDropdownOpen(): boolean {
    return this.multiSelectDropdown?.isOpen() ?? false;
  }

  #isAsyncCustomOption(): boolean {
    return this.customOptionAsync != null;
  }

  #onAsyncCustomOptionCompletedSuccessfully(): void {
    this.isAddingCustomOption = false;
    this.customOptionInput = '';
    this.getFilterList();
  }

  #setupScrollListener(): void {
    if (!this.scrollWrapper?.nativeElement) {
      return;
    }

    fromEvent(this.scrollWrapper.nativeElement, 'scroll')
      .pipe(debounceTime(100), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        if (!this.scrollEndEnabled) {
          return;
        }

        const element = this.scrollWrapper.nativeElement;
        const scrollPosition = element.scrollTop + element.clientHeight;
        const scrollHeight = element.scrollHeight;

        if (scrollHeight - scrollPosition <= this.scrollEndThreshold) {
          this.scrollEnd.emit();
        }
      });
  }
}
