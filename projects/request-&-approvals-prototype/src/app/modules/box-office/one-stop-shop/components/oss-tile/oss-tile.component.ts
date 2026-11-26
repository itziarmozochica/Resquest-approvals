import { CurrencyPipe, DatePipe, LowerCasePipe, NgIf, NgSwitch, NgSwitchCase, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  Signal,
  ViewChild,
  viewChild,
  WritableSignal,
} from '@angular/core';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { Money } from '@fz-original/app/shared/models/money.model';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { OssTileCategory, OssTileType } from '../../models';

export enum OssTileVariant {
  DEFAULT = 'default',
  LARGE = 'large',
}

@Component({
  selector: 'app-oss-tile',
  templateUrl: './oss-tile.component.html',
  styleUrls: ['./oss-tile.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    IgntIconComponent,
    IgntTagComponent,
    LowerCasePipe,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgTemplateOutlet,
    TranslateModule,
  ],
  host: {
    '[attr.style]': 'fillColorBarCustom',
  },
})
export class OssTileComponent implements AfterViewInit, OnChanges, OnDestroy {
  #breakpointStateService = inject(BreakpointStateService);
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  #clickIndicatorDuration = 400;
  readonly #zone = inject(NgZone);
  #previousItemKey: string | null = null;
  #renderTime = performance.now();
  #rippleAnimationDuration = 400;
  #rippleTimeoutId: ReturnType<typeof setTimeout> | null = null;

  get fillColorBarCustom(): string {
    return this.customColor && this.customColor.length > 0 ? `--color-bar-custom: ${this.customColor};` : '';
  }
  @Output() add = new EventEmitter<{ id: number; type: OssTileType }>();
  @Input({ required: true }) category!: OssTileCategory;
  @Input() customColor: string | null = null;
  @Input() explodePipeName: string | null = null;
  @Input({ required: true }) id!: number;
  @Input() isHidden = false;
  @Input() isOutOfStock = false;
  @Input() itemKey: string | null = null;
  isClickIndicator: WritableSignal<boolean> = signal(false);
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isRippleActive: WritableSignal<boolean> = signal(false);
  @Input() isUnavailable = false;
  @Input() locale: string | null = null;
  @Input({ required: true }) name!: string;
  @Input() planName: string | null = null;
  showWarning = input(false);
  @Input() price: Money | null = null;
  priceWithDiscount = input<Money | null>(null);
  rippleX: WritableSignal<string> = signal('0px');
  rippleY: WritableSignal<string> = signal('0px');
  shouldShowTileIcon: Signal<boolean> = computed(() => !this.isMobile() || this.type === OssTileType.PARENT);
  readonly rippleRef = viewChild<ElementRef<HTMLSpanElement>>('ripple');
  @ViewChild('tileButton') tileButtonRef!: ElementRef<HTMLButtonElement>;
  @Input() timeslot: string | null = null;
  @Input() timezone: string | null = null;
  @Input({ required: true }) type!: OssTileType;
  @Input() unitsAvailable: number | null = null;
  @Input() variant: OssTileVariant = OssTileVariant.DEFAULT;

  protected readonly OSSTileCategory = OssTileCategory;
  protected readonly OssTileType = OssTileType;
  protected readonly OssTileVariant = OssTileVariant;

  addUnit(event: MouseEvent): void {
    if (this.isOutOfStock || this.isUnavailable) {
      return;
    }
    if (this.tileButtonRef?.nativeElement?.disabled) {
      return;
    }
    this.#triggerRipple(event);
    this.add.emit({ id: this.id, type: this.type });
  }

  ngAfterViewInit(): void {
    this.#renderTime = performance.now();
  }

  ngOnChanges(): void {
    this.#renderTime = performance.now();

    if (this.itemKey !== this.#previousItemKey) {
      this.#resetRippleState();
      this.#previousItemKey = this.itemKey;
    }
  }

  ngOnDestroy(): void {
    if (this.#rippleTimeoutId) {
      clearTimeout(this.#rippleTimeoutId);
    }
  }

  #triggerRipple(event: MouseEvent): void {
    if (event.timeStamp < this.#renderTime) {
      return;
    }

    if (this.#rippleTimeoutId) {
      clearTimeout(this.#rippleTimeoutId);
    }

    const button = this.tileButtonRef.nativeElement;
    const rect = button.getBoundingClientRect();

    this.rippleX.set(`${event.clientX - rect.left}px`);
    this.rippleY.set(`${event.clientY - rect.top}px`);

    const isParentTile = this.type === OssTileType.PARENT;
    const duration = isParentTile ? this.#clickIndicatorDuration : this.#rippleAnimationDuration;

    if (this.isRippleActive()) {
      this.#restartRippleAnimation();
    }

    this.isRippleActive.set(true);
    this.isClickIndicator.set(isParentTile);

    this.#zone.runOutsideAngular(() => {
      this.#rippleTimeoutId = setTimeout(() => {
        this.isRippleActive.set(false);
        this.isClickIndicator.set(false);
        this.#rippleTimeoutId = null;
      }, duration);
    });
  }

  // A class binding set to the value it already has leaves the DOM untouched, so a repeat tap would not
  // restart the CSS animation. Render the class off and force a reflow, synchronously, before it goes back on.
  #restartRippleAnimation(): void {
    this.isRippleActive.set(false);
    this.#changeDetectorRef.detectChanges();
    void this.rippleRef()?.nativeElement.offsetWidth;
  }

  #resetRippleState(): void {
    if (this.#rippleTimeoutId) {
      clearTimeout(this.#rippleTimeoutId);
      this.#rippleTimeoutId = null;
    }
    this.isClickIndicator.set(false);
    this.isRippleActive.set(false);
    this.rippleX.set('0px');
    this.rippleY.set('0px');
  }
}
