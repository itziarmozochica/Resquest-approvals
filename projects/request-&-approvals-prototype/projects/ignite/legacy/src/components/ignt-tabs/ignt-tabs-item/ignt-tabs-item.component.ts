import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  input,
  Input,
  Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntTabsVariant, IgntTabsVariantET } from '@ignite/legacy/enums/ignt-tabs.enum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ignt-tabs-item',
  standalone: true,
  templateUrl: './ignt-tabs-item.html',
})
export class IgntTabsItemComponent implements AfterViewInit {
  #contentPortal!: TemplatePortal;
  #isActive = false;
  #isSelectable = true;
  readonly #viewContainerRef = inject(ViewContainerRef);
  readonly label = input.required<string>();
  get content(): TemplatePortal {
    return this.#contentPortal;
  }
  @Input()
  get isActive() {
    return this.#isActive;
  }
  set isActive(value: boolean) {
    this.#isActive = coerceBooleanProperty(value);
  }
  @Input()
  get isSelectable() {
    return this.#isSelectable;
  }
  set isSelectable(value: boolean) {
    this.#isSelectable = coerceBooleanProperty(value);
  }
  @Input() icon?: IconProp = undefined;
  @ViewChild(TemplateRef)
  plainContent: TemplateRef<unknown> | null = null;
  @Output() readonly tabClick: EventEmitter<void> = new EventEmitter<void>();

  // @ContentChild(IgntTabsContentDirective, { read: TemplateRef })
  templateContent: TemplateRef<unknown> | null = null;
  @Input() variant = IgntTabsVariant[IgntTabsVariant.default] as IgntTabsVariantET;

  ngAfterViewInit(): void {
    const template = this.templateContent || this.plainContent;
    if (!template) {
      throw new Error('IgntTabsItemComponent: No template content found');
    }
    this.#contentPortal = new TemplatePortal(template, this.#viewContainerRef);
  }
}
