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

type LinkSentiment = 'primary' | 'danger';
type LinkSize = 'base' | 'small' | 'caption';

@Component({
  selector: '[igntLink]',
  templateUrl: './ignt-link.component.html',
  styleUrls: ['./ignt-link.component.scss'],
  standalone: true,
  imports: [IconsModule, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntLinkComponent implements OnChanges, OnInit {
  static readonly baseClass = 'link';
  @Input() sentiment: LinkSentiment = 'primary';
  @Input() size: LinkSize = 'base';
  @Input() leadingIcon: IconProp | null = null;
  @Input() trailingIcon: IconProp | null = null;

  #element = inject(ElementRef);
  #renderer = inject(Renderer2);

  ngOnInit() {
    this.#renderer.addClass(this.#element.nativeElement, IgntLinkComponent.baseClass);
    if (this.sentiment) {
      this.addModifier(this.sentiment);
    }
    if (this.size && this.size !== 'base') {
      this.addModifier(this.size);
    }
  }

  ngOnChanges({ sentiment, size }: SimpleChanges) {
    if (sentiment) {
      this.classValueChanged(sentiment);
    }
    if (size) {
      this.classValueChanged(size);
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

  private addModifier(modifier: string): void {
    if (modifier !== 'base') {
      if (modifier === 'primary') {
        this.#renderer.addClass(this.#element.nativeElement, `${IgntLinkComponent.baseClass}`);
      } else {
        this.#renderer.addClass(this.#element.nativeElement, `${IgntLinkComponent.baseClass}--${modifier}`);
      }
    }
  }

  private removeModifier(modifier: string): void {
    if (modifier !== 'base') {
      if (modifier === 'primary') {
        this.#renderer.removeClass(this.#element.nativeElement, `${IgntLinkComponent.baseClass}`);
      } else {
        this.#renderer.removeClass(this.#element.nativeElement, `${IgntLinkComponent.baseClass}--${modifier}`);
      }
    }
  }
}
