import { CdkAccordionItem, CdkAccordionModule } from '@angular/cdk/accordion';
import { NgClass, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, Input, Signal, ViewChild } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faChevronDown, faChevronUp } from '@fortawesome/pro-solid-svg-icons';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { memo } from '@fz-original/app/app/utils/ng/ng.util';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

import { IgntDividerComponent } from '../ignt-divider/ignt-divider.component';
import { IgntWrapperCardComponent } from '../ignt-wrapper-card/ignt-wrapper-card.component';

@Component({
  selector: 'ignt-expansion-panel',
  templateUrl: './ignt-expansion-panel.component.html',
  styleUrls: ['./ignt-expansion-panel.component.scss'],
  imports: [NgIf, IconsModule, CdkAccordionModule, NgClass, IgntWrapperCardComponent, NgTemplateOutlet, IgntDividerComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntExpansionPanelComponent {
  #breakpointStateService = inject(BreakpointStateService);
  get containerClasses(): Record<string, boolean> {
    return {
      'ignt-expansion-panel__container': this.isNotMenuVariant(),
      'ignt-expansion-panel-menu__container': this.isMenuVariant(),
    };
  }
  get contentClasses(): Record<string, boolean> {
    return {
      'ignt-expansion-panel__content': this.isNotMenuVariant(),
    };
  }
  get headerClasses(): Record<string, boolean> {
    return {
      'ignt-expansion-panel__header': true,
      'ignt-expansion-panel__header--chevron-start': this.chevronPosition() === 'start',
    };
  }
  @Input() set closeIt(value: { timestamp: number }) {
    if (this.accordionItem !== undefined && value.timestamp !== 0 && this.accordionItem.opened) {
      this.accordionItem.close();
    }
  }
  @Input() set openIt(value: { timestamp: number }) {
    if (this.accordionItem !== undefined && value.timestamp !== 0 && this.accordionItem.closed) {
      this.accordionItem.open();
    }
  }
  @ViewChild(CdkAccordionItem) accordionItem!: CdkAccordionItem;
  @Input() elevation = 0;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  getExpanded: () => boolean = memo<() => boolean>(() => {
    return this.isNotMenuVariant() ? !this.isCollapsed : !this.isCollapsed || !this.isMobile();
  });
  isBorderlessVariant = memo<() => boolean>(() => this.variant === 'borderless');
  isCardVariant: () => boolean = memo<() => boolean>(() => this.variant === 'card');

  @Input() isCollapsed = true;
  isMenuVariant = memo<() => boolean>(() => this.variant === 'menu');
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isNotMenuVariant: () => boolean = memo<() => boolean>(() => this.variant !== 'menu');

  @Input() label = '';
  @Input() title = '';
  @Input() variant: 'card' | 'menu' | 'borderless' = 'card';
  chevronPosition = input<'start' | 'end'>('end');
  @Input() icon?: IconProp;
  @Input() badgeCount?: number;
  @Input() badgeAriaLabel?: string;

  constructor() {
    effect(() => {
      if (!this.isMobile() && this.isMenuVariant() && this.accordionItem?.closed) {
        this.accordionItem.open();
      }
    });
  }
}
