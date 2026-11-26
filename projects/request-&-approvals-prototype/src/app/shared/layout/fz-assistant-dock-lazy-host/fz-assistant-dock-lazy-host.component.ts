import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal, type Type } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  selector: 'app-fz-assistant-dock-lazy-host',
  standalone: true,
  styleUrl: './fz-assistant-dock-lazy-host.component.scss',
  templateUrl: './fz-assistant-dock-lazy-host.component.html',
})
export class FzAssistantDockLazyHostComponent implements OnInit {
  readonly #dockComponentType = signal<Type<unknown> | null>(null);

  readonly dockComponentType = this.#dockComponentType.asReadonly();

  ngOnInit(): void {
    void import(
      '@fz-original/app/modules/reports/fz-assistant-view/components/fz-assistant-layout-dock/fz-assistant-layout-dock.component'
    ).then(m => {
      this.#dockComponentType.set(m.FzAssistantLayoutDockComponent);
    });
  }
}
