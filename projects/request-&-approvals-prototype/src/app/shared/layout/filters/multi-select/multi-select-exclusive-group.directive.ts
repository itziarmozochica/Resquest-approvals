import { Directive, forwardRef, inject } from '@angular/core';

import { ErrorLikeWithContext } from '../../../services/error-logger/error-like-with-context';
import { ErrorLoggerService } from '../../../services/error-logger/error-logger.service';
import { isErrorLike } from '../../../utils/is-error.utils';
import { MultiSelectExclusiveGroup, MultiSelectExclusiveGroupMember } from './multi-select-exclusive-group.model';
import { MULTI_SELECT_EXCLUSIVE_GROUP } from './multi-select-exclusive-group.token';

@Directive({
  providers: [{ provide: MULTI_SELECT_EXCLUSIVE_GROUP, useExisting: forwardRef(() => MultiSelectExclusiveGroupDirective) }],
  selector: '[appMultiSelectExclusiveGroup]',
})
export class MultiSelectExclusiveGroupDirective implements MultiSelectExclusiveGroup {
  readonly #errorLogger = inject(ErrorLoggerService);
  readonly #members = new Set<MultiSelectExclusiveGroupMember>();
  #notifying = false;

  notifyOpened(opened: MultiSelectExclusiveGroupMember): void {
    if (this.#notifying) {
      return;
    }

    this.#notifying = true;
    try {
      for (const member of [...this.#members]) {
        if (member !== opened && this.#members.has(member)) {
          this.#closeContained(member);
        }
      }
      this.#assertOnlyOpened(opened);
    } finally {
      this.#notifying = false;
    }
  }

  register(member: MultiSelectExclusiveGroupMember): void {
    this.#members.add(member);
  }

  unregister(member: MultiSelectExclusiveGroupMember): void {
    this.#members.delete(member);
  }

  #assertOnlyOpened(opened: MultiSelectExclusiveGroupMember): void {
    const openMembers = [...this.#members].filter(member => member !== opened && this.#isOpenOrUnknown(member)).length;
    if (openMembers > 0) {
      this.#errorLogger.trace(new ErrorLikeWithContext('Exclusive multi-select group left a member open', { openMembers }));
    }
  }

  #closeContained(member: MultiSelectExclusiveGroupMember): void {
    try {
      if (member.isOpen()) {
        member.close();
      }
    } catch (error: unknown) {
      this.#errorLogger.trace(
        new ErrorLikeWithContext('Exclusive multi-select group could not close a member', { reason: this.#describeFailure(error) }),
      );
    }
  }

  #describeFailure(error: unknown): string {
    return isErrorLike(error) ? error.name : typeof error;
  }

  #isOpenOrUnknown(member: MultiSelectExclusiveGroupMember): boolean {
    try {
      return member.isOpen();
    } catch {
      return true;
    }
  }
}
