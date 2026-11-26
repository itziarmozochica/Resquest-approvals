import { NgIf } from '@angular/common';
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
} from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

export type ButtonVariant = 'default' | 'sharp' | 'danger' | 'success';
export type ButtonSentiment = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'small' | 'large';

/**
 * @deprecated Use `IgntButtonComponent` from `@ignite/common` instead.
 */
@Component({
  selector: '[igntButton]',
  templateUrl: './ignt-button.component.html',
  styleUrls: ['./ignt-button.component.scss'],
  standalone: true,
  imports: [IconsModule, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntButtonComponent implements OnChanges, OnInit {
  @Input() loading?: boolean;
  @Input() fill = false;
  @Input() variant: ButtonVariant = 'default';
  @Input() sentiment: ButtonSentiment = 'primary';
  @Input() size: ButtonSize = 'large';
  @Input() leadingIcon: IconProp | null = null;
  @Input() trailingIcon: IconProp | null = null;

  #element = inject(ElementRef);
  #renderer = inject(Renderer2);
  readonly #BASE_CLASS = 'button';

  ngOnInit() {
    this.#renderer.addClass(this.#element.nativeElement, this.#BASE_CLASS);
    if (this.sentiment || this.variant) {
      this.addVariantAndSentiment(this.variant, this.sentiment);
    }
    if (this.size) {
      this.addModifier(this.size);
    }
    if (this.fill) {
      this.addModifier('fill');
    }
  }

  ngOnChanges({ sentiment, size, variant, fill }: SimpleChanges) {
    if (size) {
      this.classValueChanged(size);
    }
    if (variant) {
      this.variantValueChanged(variant);
    }
    if (sentiment) {
      this.sentimentValueChanged(sentiment);
    }
    if (fill) {
      this.toggleClassValueChanged(fill, 'fill');
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
    this.#renderer.addClass(this.#element.nativeElement, `${this.#BASE_CLASS}--${modifier}`);
  }

  private removeModifier(modifier: string): void {
    this.#renderer.removeClass(this.#element.nativeElement, `${this.#BASE_CLASS}--${modifier}`);
  }

  private addVariantAndSentiment(variant: ButtonVariant, sentiment: ButtonSentiment): void {
    if (!variant || variant === 'default') {
      this.#renderer.addClass(this.#element.nativeElement, `${this.#BASE_CLASS}--${sentiment}`);
    } else {
      this.#renderer.addClass(this.#element.nativeElement, `${this.#BASE_CLASS}--${variant}-${sentiment}`);
    }
  }

  private removeVariantAndSentiment(variant: ButtonVariant, sentiment: ButtonSentiment): void {
    if (!variant || variant === 'default') {
      this.#renderer.removeClass(this.#element.nativeElement, `${this.#BASE_CLASS}--${sentiment}`);
    } else {
      this.#renderer.removeClass(this.#element.nativeElement, `${this.#BASE_CLASS}--${variant}-${sentiment}`);
    }
  }
}
