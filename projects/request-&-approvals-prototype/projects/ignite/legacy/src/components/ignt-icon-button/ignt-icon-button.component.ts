import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChange,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

export type IconButtonVariant = 'default' | 'sharp' | 'danger';
export type IconButtonSentiment = 'primary' | 'secondary' | 'tertiary';
export type IconButtonSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'button[ignt-icon-button], a[ignt-icon-button]',
  templateUrl: './ignt-icon-button.component.html',
  styleUrls: ['./ignt-icon-button.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule],
})
export class IgntIconButtonComponent implements OnInit, OnChanges {
  #element = inject(ElementRef);
  #renderer = inject(Renderer2);
  readonly baseClass = 'icon-button';

  @Input() disabled = false;
  @Input() fab = false;
  @Input() icon: IconProp = ['fas', 'star'];
  @Input() sentiment: IconButtonSentiment = 'primary';
  @Input() size: IconButtonSize = 'medium';
  @Input() variant: IconButtonVariant = 'default';

  ngOnChanges(changes: SimpleChanges) {
    if (changes.sentiment) {
      this.sentimentValueChanged(changes.sentiment);
    }
    if (changes.size) {
      this.classValueChanged(changes.size);
    }
    if (changes.variant) {
      this.variantValueChanged(changes.variant);
    }
    if (changes.fab) {
      this.toggleClassValueChanged(changes.fab, 'fab');
    }
    if (changes.disabled) {
      this.updateDisabledState();
    }
  }

  ngOnInit() {
    this.#renderer.addClass(this.#element.nativeElement, this.baseClass);
    this.initializeStyles();
    this.updateDisabledState();
  }

  private initializeStyles(): void {
    this.addVariantAndSentiment(this.variant, this.sentiment);
    this.addModifier(this.size);
    if (this.fab) {
      this.addModifier('fab');
    }
  }

  private stateValueChanged(state: SimpleChange): void {
    if (state?.previousValue) {
      this.removeModifier(state.previousValue);
    }
    if (state?.currentValue) {
      this.addModifier(state.currentValue);
    }
  }

  private variantValueChanged(variant: SimpleChange): void {
    if (variant?.previousValue) {
      this.removeVariantAndSentiment(variant.previousValue, this.sentiment);
    }
    if (variant?.currentValue) {
      this.addVariantAndSentiment(variant.currentValue, this.sentiment);
    }
  }

  private sentimentValueChanged(sentiment: SimpleChange): void {
    if (sentiment?.previousValue) {
      this.removeVariantAndSentiment(this.variant, sentiment.previousValue);
    }
    if (sentiment?.currentValue) {
      this.addVariantAndSentiment(this.variant, sentiment.currentValue);
    }
  }

  private classValueChanged(property: SimpleChange): void {
    if (property?.previousValue) {
      this.removeModifier(property.previousValue);
    }
    if (property?.currentValue) {
      this.addModifier(property.currentValue);
    }
  }

  private toggleClassValueChanged(property: SimpleChange, modifier: string): void {
    if (!property?.currentValue) {
      this.removeModifier(modifier);
    }
    if (property?.currentValue) {
      this.addModifier(modifier);
    }
  }

  private addModifier(modifier: string): void {
    this.#renderer.addClass(this.#element.nativeElement, `${this.baseClass}--${modifier}`);
  }

  private removeModifier(modifier: string): void {
    this.#renderer.removeClass(this.#element.nativeElement, `${this.baseClass}--${modifier}`);
  }

  private addVariantAndSentiment(variant: IconButtonVariant, sentiment: IconButtonSentiment): void {
    if (!variant || variant === 'default') {
      this.#renderer.addClass(this.#element.nativeElement, `${this.baseClass}--${sentiment}`);
    } else {
      this.#renderer.addClass(this.#element.nativeElement, `${this.baseClass}--${variant}-${sentiment}`);
    }
  }

  private removeVariantAndSentiment(variant: IconButtonVariant, sentiment: IconButtonSentiment): void {
    if (!variant || variant === 'default') {
      this.#renderer.removeClass(this.#element.nativeElement, `${this.baseClass}--${sentiment}`);
    } else {
      this.#renderer.removeClass(this.#element.nativeElement, `${this.baseClass}--${variant}-${sentiment}`);
    }
  }

  private updateDisabledState(): void {
    this.#renderer.setProperty(this.#element.nativeElement, 'disabled', this.disabled);
  }
}
