import {
  ComponentFactory,
  ComponentFactoryResolver,
  Directive,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import { InlineLoaderComponent } from './inline-loader.component';

@Directive({
  selector: '[inlineLoader]',
  exportAs: 'inlineLoader',
  standalone: false,
})
export class InlineLoaderDirective implements OnChanges {
  @Input('inlineLoader') visible = false;

  private componentFactory: ComponentFactory<InlineLoaderComponent>;

  constructor(
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private componentFactoryResolver: ComponentFactoryResolver,
  ) {
    this.componentFactory = this.componentFactoryResolver.resolveComponentFactory(InlineLoaderComponent);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.visible) {
      this.viewContainerRef.clear();
      if (changes.visible.currentValue) {
        this.viewContainerRef.createComponent(this.componentFactory);
      } else {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
      }
    }
  }
}
