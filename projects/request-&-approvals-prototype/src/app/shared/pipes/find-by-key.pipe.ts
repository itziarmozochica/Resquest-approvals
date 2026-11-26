import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'findByKey',
  standalone: false,
})
export class FindByKeyPipe implements PipeTransform {
  transform<T, K extends keyof T>(input: Array<T>, key: K, value: string | number): T | undefined {
    return input.find(obj => obj[key] === value);
  }
}
