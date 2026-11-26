import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pluck',
  standalone: false,
})
export class PluckPipe implements PipeTransform {
  transform<T, K extends keyof T>(input: Array<T>, key: K): Array<T[K]> {
    return input.map(value => value[key]);
  }
}
