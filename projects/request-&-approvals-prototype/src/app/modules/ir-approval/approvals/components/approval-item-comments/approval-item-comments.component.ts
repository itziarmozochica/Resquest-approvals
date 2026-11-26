import { DatePipe, DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  input,
  linkedSignal,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntAlertComponent, IgntButtonComponent, IgntButtonIcon, IgntToastService } from '@ignite/common';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  approvalCommentMentionKeys,
  ApprovalItemComment,
  ApprovalItemCommentField,
  ApprovalItemCommentKind,
  approvalItemCommentMaxLength,
  ApprovalItemCommentView,
  ApprovalMentionable,
  ApprovalMentionAccessAction,
  ApprovalMentionAccessOutcome,
  ApprovalMentionOption,
  ApprovalUnnotifiedMention,
} from '../../models/approval-item-comment.model';
import { ApprovalsService } from '../../services/approvals.service';
import {
  commentEditErrorKey,
  commentPostErrorKey,
  isCommentAccessError,
  MentionAccessFailureAction,
  mentionAccessFailureAction,
} from '../../utils/approval-comment-errors.util';
import { mentionNoticeKey } from '../../utils/approval-comment-mention-notice.util';
import {
  commentInitials,
  CommentMentionQuery,
  filterMentionables,
  findMentionQuery,
  insertMention,
  mentionedEmailsIn,
  mergeLocalComments,
  normaliseCommentEmail,
  splitMentionSegments,
  upsertComments,
} from '../../utils/approval-comment-mentions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:pointerdown)': 'onDocumentPointerdown($event)' },
  imports: [
    DatePipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslateModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntTagComponent,
    IgntTextareaFieldComponent,
  ],
  selector: 'app-approval-item-comments',
  styleUrl: './approval-item-comments.component.scss',
  templateUrl: './approval-item-comments.component.html',
})
export class ApprovalItemCommentsComponent implements OnInit {
  readonly partnerId = input.required<number>();
  readonly launchId = input<string | null>(null);
  readonly approvalId = input.required<string>();
  readonly itemId = input.required<string>();
  readonly canPost = input<boolean>(false);
  readonly mentionable = input<ApprovalMentionable[]>([]);
  readonly isHubPermissionsEnabled = input<boolean>(false);
  readonly isMentionAccessAddBlocked = input<boolean>(false);
  readonly countChange = output<number>();
  readonly accessChanged = output<void>();
  readonly commentEdited = output<ApprovalItemComment>();
  readonly submittingChange = output<boolean>();
  readonly mentionAccessGranted = output<void>();
  readonly mentionAccessAddingChange = output<boolean>();

  readonly #service = inject(ApprovalsService);
  readonly #toastService = inject(IgntToastService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #document = inject(DOCUMENT);
  readonly #viewer = inject(UserService).getUser();
  readonly #viewerEmail = normaliseCommentEmail(this.#viewer?.email ?? '');
  protected readonly composer = viewChild<IgntTextareaFieldComponent>('composerField');
  protected readonly editor = viewChild<IgntTextareaFieldComponent>('editorField');
  readonly #comments = signal<ApprovalItemComment[]>([]);
  readonly #selectedMentions = signal<ReadonlyMap<string, string>>(new Map<string, string>());
  readonly #editMentions = signal<ReadonlyMap<string, string>>(new Map<string, string>());
  readonly #editOriginalBody = signal<string>('');
  readonly #localSinceLoad = signal<readonly ApprovalItemComment[]>([]);
  readonly #mentionAccessCalls = signal<ReadonlyMap<string, ApprovalMentionAccessAction>>(new Map<string, ApprovalMentionAccessAction>());
  readonly #hiddenMentionNotices = signal<ReadonlySet<string>>(new Set<string>());
  readonly #mentionAnnouncement = signal<string>('');
  readonly #mentionField = linkedSignal<string | null, ApprovalItemCommentField>({
    source: () => this.editingId(),
    computation: (editingId, previous) => (editingId === null ? 'composer' : (previous?.value ?? 'composer')),
  });
  readonly #mentionQuery = linkedSignal<ApprovalItemCommentField, CommentMentionQuery | null>({
    source: () => this.#mentionField(),
    computation: (field, previous) => (previous !== undefined && previous.source === field ? previous.value : null),
  });
  #dismissedMentionStart: number | null = null;
  #mentionListPress: PointerEvent | null = null;
  #settingValue = false;
  #editSession = 0;
  #loadSubscription: Subscription | null = null;
  #pendingWrites = 0;
  #hasLoaded = false;

  protected readonly maxLength = approvalItemCommentMaxLength;
  protected readonly sendIcon: IgntButtonIcon = { name: 'paper-plane', variant: 'solid' };
  protected readonly editIcon: IgntButtonIcon = { name: 'edit', variant: 'light' };
  protected readonly bodyControl = new FormControl<string>('', { nonNullable: true });
  protected readonly editControl = new FormControl<string>('', { nonNullable: true });
  protected readonly loading = signal<boolean>(true);
  protected readonly loadFailed = signal<boolean>(false);
  protected readonly refreshFailed = signal<boolean>(false);
  protected readonly submitting = signal<boolean>(false);
  protected readonly editingId = linkedSignal<boolean, string | null>({
    source: () => this.canPost(),
    computation: (canPost, previous) => (canPost ? (previous?.value ?? null) : null),
  });
  protected readonly savingEdit = linkedSignal<string | null, boolean>({
    source: () => this.editingId(),
    computation: () => false,
  });
  protected readonly activeMentionIndex = signal<number>(0);
  protected readonly mentionAnnouncement = this.#mentionAnnouncement.asReadonly();
  readonly #body = toSignal(this.bodyControl.valueChanges, { initialValue: '' });
  readonly #editBody = toSignal(this.editControl.valueChanges, { initialValue: '' });

  protected readonly canSubmit = computed<boolean>(() => {
    const body = this.#body().trim();
    return !this.submitting() && body.length > 0 && body.length <= approvalItemCommentMaxLength;
  });

  protected readonly canSaveEdit = computed<boolean>(() => {
    const body = this.#editBody().trim();
    return !this.savingEdit() && body.length > 0 && body.length <= approvalItemCommentMaxLength && body !== this.#editOriginalBody();
  });

  protected readonly mentionOptions = computed<ApprovalMentionOption[]>(() => {
    const query = this.#mentionQuery();
    if (query === null) {
      return [];
    }
    const isHubPermissionsEnabled = this.isHubPermissionsEnabled();
    return filterMentionables(this.mentionable(), query.query).map(person => ({
      person,
      initials: commentInitials(person.name, person.email),
      isWithoutAccess: isHubPermissionsEnabled && !person.hasAccess,
    }));
  });

  protected readonly isMentionPickerOpen = computed<boolean>(() => this.#mentionField() === 'composer' && this.mentionOptions().length > 0);
  protected readonly isEditMentionPickerOpen = computed<boolean>(
    () => this.#mentionField() === 'editor' && this.mentionOptions().length > 0,
  );
  protected readonly composerId = computed<string>(() => `approval-item-comment-${this.itemId()}`);
  protected readonly mentionListId = computed<string>(() => `${this.composerId()}-mentions`);
  readonly #namesByEmail = computed<ReadonlyMap<string, string>>(() => {
    const namesByEmail = new Map<string, string>([
      ...this.#comments().map((comment): [string, string] => [normaliseCommentEmail(comment.authorEmail), comment.authorName]),
      ...this.mentionable().map((person): [string, string] => [normaliseCommentEmail(person.email), person.name]),
    ]);
    const viewerName = this.#viewer?.name?.trim();
    if (this.#viewerEmail && viewerName) {
      namesByEmail.set(this.#viewerEmail, viewerName);
    }
    return namesByEmail;
  });

  readonly #peopleWithAccess = computed<ReadonlySet<string>>(
    () =>
      new Set<string>(
        this.mentionable().flatMap((person): string[] => (person.hasAccess === true ? [normaliseCommentEmail(person.email)] : [])),
      ),
  );

  protected readonly thread = computed<ApprovalItemCommentView[]>(() => {
    const namesByEmail = this.#namesByEmail();
    const canPost = this.canPost();
    return this.#comments().map(comment => {
      const isEditable = canPost && this.#viewerEmail.length > 0 && normaliseCommentEmail(comment.authorEmail) === this.#viewerEmail;
      return {
        comment,
        initials: commentInitials(comment.authorName, comment.authorEmail),
        isRejectionReason: comment.kind === ApprovalItemCommentKind.RejectionReason,
        segments: splitMentionSegments(
          comment.body,
          comment.mentionedEmails.flatMap((email): string[] => {
            const name = namesByEmail.get(normaliseCommentEmail(email));
            return name === undefined ? [] : [name];
          }),
        ),
        displayedAt: comment.editedAt ?? comment.createdAt,
        isEditable,
        unnotifiedMentions: isEditable ? this.#unnotifiedMentions(comment, namesByEmail) : [],
      };
    });
  });

  constructor() {
    this.bodyControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (!this.#settingValue) {
        this.refreshMentionQuery('composer');
      }
    });
    this.editControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (!this.#settingValue) {
        this.refreshMentionQuery('editor');
      }
    });
  }

  ngOnInit(): void {
    this.#load();
  }

  reload(): void {
    if (!this.#hasLoaded) {
      this.retryLoad();
      return;
    }
    this.refreshFailed.set(false);
    this.#load();
  }

  protected refreshMentionQuery(field: ApprovalItemCommentField): void {
    const text = this.#control(field).value;
    const query = findMentionQuery(text, this.#caret(field, text));
    if (field !== this.#mentionField()) {
      if (query === null) {
        return;
      }
      this.#dismissedMentionStart = null;
      this.#mentionQuery.set(null);
      this.#mentionField.set(field);
    }
    if (query === null || query.start !== this.#dismissedMentionStart) {
      this.#dismissedMentionStart = null;
    }
    const next = query !== null && query.start !== this.#dismissedMentionStart ? query : null;
    const current = this.#mentionQuery();
    if (next?.start !== current?.start || next?.query !== current?.query) {
      this.activeMentionIndex.set(0);
    }
    this.#mentionQuery.set(next);
  }

  protected onComposerKeydown(event: KeyboardEvent): void {
    this.#handleMentionKeydown('composer', event);
  }

  protected onEditorKeydown(event: KeyboardEvent): void {
    if (this.#handleMentionKeydown('editor', event) || event.key !== 'Escape') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!this.savingEdit()) {
      this.cancelEdit();
    }
  }

  protected onFieldKeyup(event: KeyboardEvent, field: ApprovalItemCommentField): void {
    if (!approvalCommentMentionKeys.includes(event.key)) {
      this.refreshMentionQuery(field);
    }
  }

  protected onDocumentPointerdown(event: PointerEvent): void {
    if (event === this.#mentionListPress || this.#mentionListPress === null) {
      return;
    }
    this.#mentionListPress = null;
    const field = this.#mentionField();
    if (this.#document.activeElement !== this.#textarea(field)) {
      this.#closeMentionPicker(field);
    }
  }

  protected onFieldBlur(field: ApprovalItemCommentField): void {
    if (this.#mentionListPress === null) {
      this.#closeMentionPicker(field);
    }
  }

  protected onMentionListMousedown(event: MouseEvent): void {
    event.preventDefault();
  }

  protected onMentionListPointerdown(event: PointerEvent): void {
    event.preventDefault();
    this.#mentionListPress = event;
  }

  protected onMentionOptionClick(person: ApprovalMentionable): void {
    this.#selectMention(person);
  }

  protected mentionOptionId(index: number): string {
    return `${this.mentionListId()}-option-${index}`;
  }

  protected editButtonId(commentId: string): string {
    return `approval-item-comment-edit-button-${commentId}`;
  }

  protected mentionNoticesId(commentId: string): string {
    return `approval-item-comment-mention-notices-${commentId}`;
  }

  protected mentionNoticeId(commentId: string, email: string): string {
    return `approval-item-comment-mention-notice-${commentId}-${normaliseCommentEmail(email)}`;
  }

  protected editorId(commentId: string): string {
    return `approval-item-comment-edit-${commentId}`;
  }

  protected addMentionAccess(commentId: string, mention: ApprovalUnnotifiedMention): void {
    this.#callMentionAccess(commentId, mention, ApprovalMentionAccessAction.Add);
  }

  protected dismissMentionAccess(commentId: string, mention: ApprovalUnnotifiedMention): void {
    this.#callMentionAccess(commentId, mention, ApprovalMentionAccessAction.Dismiss);
  }

  protected retryLoad(): void {
    this.loadFailed.set(false);
    this.loading.set(true);
    this.#load();
  }

  protected submit(): void {
    if (!this.canPost() || this.loadFailed() || !this.canSubmit()) {
      return;
    }
    const body = this.bodyControl.value.trim();
    this.submitting.set(true);
    this.#beginWrite();
    this.#service
      .postItemComment(this.partnerId(), this.launchId(), this.approvalId(), this.itemId(), {
        body,
        mentionedEmails: mentionedEmailsIn(body, this.#selectedMentions()),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<ApprovalItemComment | null>) => {
        this.submitting.set(false);
        this.#applyPostResponse(response);
        this.#endWrite();
      });
  }

  protected startEdit(comment: ApprovalItemComment): void {
    if (!this.thread().some(entry => entry.isEditable && entry.comment.id === comment.id)) {
      return;
    }
    this.#editSession++;
    const namesByEmail = this.#namesByEmail();
    this.#editMentions.set(
      new Map<string, string>(
        comment.mentionedEmails.flatMap((email): [string, string][] => {
          const name = namesByEmail.get(normaliseCommentEmail(email));
          return name ? [[email, name]] : [];
        }),
      ),
    );
    this.#editOriginalBody.set(comment.body.trim());
    this.#closeMentionPicker('editor');
    this.#settingValue = true;
    this.editControl.setValue(comment.body);
    this.#settingValue = false;
    this.editingId.set(comment.id);
    this.#placeCaret('editor', comment.body.length);
  }

  protected cancelEdit(): void {
    this.#closeEditor();
  }

  protected saveEdit(): void {
    const commentId = this.editingId();
    if (commentId === null || !this.canPost() || !this.canSaveEdit()) {
      return;
    }
    const body = this.editControl.value.trim();
    const mentionedEmails = mentionedEmailsIn(body, this.#editMentions());
    const session = this.#editSession;
    this.savingEdit.set(true);
    this.#beginWrite();
    this.#service
      .editItemComment(this.partnerId(), this.launchId(), this.approvalId(), this.itemId(), commentId, { body, mentionedEmails })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<ApprovalItemComment | null>) => {
        this.#applyEditResponse(response, commentId, session);
        this.#endWrite();
      });
  }

  #closeEditor(): void {
    const commentId = this.editingId();
    this.#closeMentionPicker('editor');
    this.editingId.set(null);
    this.#editMentions.set(new Map<string, string>());
    this.#editOriginalBody.set('');
    this.#settingValue = true;
    this.editControl.setValue('');
    this.#settingValue = false;
    if (commentId !== null) {
      const buttonId = this.editButtonId(commentId);
      afterNextRender(() => this.#document.getElementById(buttonId)?.querySelector('button')?.focus(), { injector: this.#injector });
    }
  }

  #applyPostResponse(response: BaseResponse<ApprovalItemComment | null>): void {
    if (response.error || !response.data) {
      this.#toastService.danger(this.#translate.instant(commentPostErrorKey(response.error)));
      if (isCommentAccessError(response.error)) {
        this.accessChanged.emit();
      }
      return;
    }
    const posted = response.data;
    this.#localSinceLoad.update(comments => [...comments, posted]);
    this.#comments.update(comments => upsertComments(comments, [posted]));
    this.#announceUnnotifiedMentions(posted);
    this.#selectedMentions.set(new Map<string, string>());
    this.bodyControl.setValue('');
    this.#closeMentionPicker('composer');
    this.countChange.emit(this.#comments().length);
  }

  #applyEditResponse(response: BaseResponse<ApprovalItemComment | null>, commentId: string, session: number): void {
    const isCurrentSession = session === this.#editSession && this.editingId() === commentId;
    if (isCurrentSession) {
      this.savingEdit.set(false);
    }
    const edited = response.data;
    if (response.error || !edited) {
      if (isCurrentSession) {
        this.#toastService.danger(this.#translate.instant(commentEditErrorKey(response.error)));
      }
      if (isCommentAccessError(response.error)) {
        this.accessChanged.emit();
      }
      return;
    }
    this.#localSinceLoad.update(comments => mergeLocalComments([...comments], [edited]));
    this.#comments.update(comments => mergeLocalComments(comments, [edited]));
    if (isCurrentSession) {
      this.#closeEditor();
    }
    this.commentEdited.emit(edited);
  }

  #unnotifiedMentions(comment: ApprovalItemComment, namesByEmail: ReadonlyMap<string, string>): ApprovalUnnotifiedMention[] {
    if (!this.isHubPermissionsEnabled() || comment.kind === ApprovalItemCommentKind.RejectionReason) {
      return [];
    }
    const hidden = this.#hiddenMentionNotices();
    const calls = this.#mentionAccessCalls();
    const peopleWithAccess = this.#peopleWithAccess();
    return comment.unnotifiedMentionEmails.flatMap((email): ApprovalUnnotifiedMention[] => {
      const key = mentionNoticeKey(comment.id, email);
      if (hidden.has(key) || peopleWithAccess.has(normaliseCommentEmail(email))) {
        return [];
      }
      const action = calls.get(key);
      return [
        {
          email,
          name: namesByEmail.get(normaliseCommentEmail(email)) ?? email,
          isAdding: action === ApprovalMentionAccessAction.Add,
          isDismissing: action === ApprovalMentionAccessAction.Dismiss,
        },
      ];
    });
  }

  #announceUnnotifiedMentions(comment: ApprovalItemComment): void {
    this.#mentionAnnouncement.set(
      this.#unnotifiedMentions(comment, this.#namesByEmail())
        .map(mention => this.#translate.instant('approvals.detail.comments.mentionWithoutAccess', { name: mention.name }))
        .join('. '),
    );
  }

  #callMentionAccess(commentId: string, mention: ApprovalUnnotifiedMention, action: ApprovalMentionAccessAction): void {
    const key = mentionNoticeKey(commentId, mention.email);
    if (!this.isHubPermissionsEnabled() || this.#mentionAccessCalls().has(key)) {
      return;
    }
    const wasAddingBefore = this.#isAddingMentionAccess();
    this.#mentionAccessCalls.update(calls => new Map(calls).set(key, action));
    this.#emitMentionAccessAddingChange(wasAddingBefore);
    this.#beginWrite();
    this.#mentionAccessCall$(commentId, mention.email, action)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<ApprovalMentionAccessOutcome | null>) => {
        const wasAddingBefore = this.#isAddingMentionAccess();
        this.#mentionAccessCalls.update(calls => {
          const next = new Map(calls);
          next.delete(key);
          return next;
        });
        this.#applyMentionAccessResponse(response, commentId, key, mention, action);
        this.#emitMentionAccessAddingChange(wasAddingBefore);
        this.#endWrite();
      });
  }

  #isAddingMentionAccess(): boolean {
    return [...this.#mentionAccessCalls().values()].includes(ApprovalMentionAccessAction.Add);
  }

  #emitMentionAccessAddingChange(wasAddingBefore: boolean): void {
    const isAdding = this.#isAddingMentionAccess();
    if (isAdding !== wasAddingBefore) {
      this.mentionAccessAddingChange.emit(isAdding);
    }
  }

  #mentionAccessCall$(
    commentId: string,
    email: string,
    action: ApprovalMentionAccessAction,
  ): Observable<BaseResponse<ApprovalMentionAccessOutcome | null>> {
    if (action === ApprovalMentionAccessAction.Add) {
      return this.#service
        .grantItemCommentMentionAccess(this.partnerId(), this.launchId(), this.approvalId(), this.itemId(), commentId, email)
        .pipe(
          map(
            response =>
              new BaseResponse<ApprovalMentionAccessOutcome | null>(
                response.data === null ? null : { action: ApprovalMentionAccessAction.Add, ...response.data },
                response.error,
              ),
          ),
        );
    }
    return this.#service
      .dismissItemCommentMentionNotice(this.partnerId(), this.launchId(), this.approvalId(), this.itemId(), commentId, email)
      .pipe(
        map(
          response =>
            new BaseResponse<ApprovalMentionAccessOutcome | null>(
              response.data === null ? null : { action: ApprovalMentionAccessAction.Dismiss, comment: response.data },
              response.error,
            ),
        ),
      );
  }

  #applyMentionAccessResponse(
    response: BaseResponse<ApprovalMentionAccessOutcome | null>,
    commentId: string,
    key: string,
    mention: ApprovalUnnotifiedMention,
    action: ApprovalMentionAccessAction,
  ): void {
    const outcome = response.data;
    if (response.error === null && outcome !== null) {
      this.#hideMentionNotice(commentId, mention, key);
      this.#comments.update(comments => upsertComments(comments, [outcome.comment]));
      if (outcome.action === ApprovalMentionAccessAction.Add) {
        this.#confirmMentionAccess(mention, outcome.isAccessGranted);
      }
      return;
    }
    if (isCommentAccessError(response.error)) {
      this.accessChanged.emit();
    }
    switch (mentionAccessFailureAction(response.error)) {
      case MentionAccessFailureAction.Reload:
        this.reload();
        break;
      case MentionAccessFailureAction.RefreshAccess:
        this.accessChanged.emit();
        break;
      case MentionAccessFailureAction.Hide:
        this.#hideMentionNotice(commentId, mention, key);
        break;
      case MentionAccessFailureAction.Toast:
        this.#toastService.danger(
          this.#translate.instant(
            action === ApprovalMentionAccessAction.Add
              ? 'approvals.detail.comments.addMentionAccessError'
              : 'approvals.detail.comments.dismissMentionAccessError',
          ),
        );
        break;
    }
  }

  #confirmMentionAccess(mention: ApprovalUnnotifiedMention, isAccessGranted: boolean): void {
    if (!isAccessGranted) {
      this.#toastService.info(this.#translate.instant('approvals.detail.comments.mentionAlreadyHasAccess', { name: mention.name }));
      this.accessChanged.emit();
      return;
    }
    this.#toastService.positive(this.#translate.instant('approvals.detail.comments.mentionAccessAdded', { name: mention.name }));
    this.mentionAccessGranted.emit();
  }

  #hideMentionNotice(commentId: string, mention: ApprovalUnnotifiedMention, key: string): void {
    const notice = this.#document.getElementById(this.mentionNoticeId(commentId, mention.email));
    this.#hiddenMentionNotices.update(hidden => new Set(hidden).add(key));
    const noticesId = this.mentionNoticesId(commentId);
    const editButtonId = this.editButtonId(commentId);
    afterNextRender(
      () => {
        if (!this.#isFocusLostWith(notice)) {
          return;
        }
        (
          this.#document.getElementById(noticesId)?.querySelector<HTMLButtonElement>('.item-comments__mention-add button') ??
          this.#document.getElementById(editButtonId)?.querySelector<HTMLButtonElement>('button')
        )?.focus();
      },
      { injector: this.#injector },
    );
  }

  #isFocusLostWith(notice: HTMLElement | null): boolean {
    const focused = this.#document.activeElement;
    return focused === null || focused === this.#document.body || (notice?.contains(focused) ?? false);
  }

  #beginWrite(): void {
    if (this.#pendingWrites++ === 0) {
      this.submittingChange.emit(true);
    }
  }

  #endWrite(): void {
    if (--this.#pendingWrites === 0) {
      this.submittingChange.emit(false);
    }
  }

  #load(): void {
    this.#localSinceLoad.set([]);
    this.#loadSubscription?.unsubscribe();
    this.#loadSubscription = this.#service
      .listItemComments(this.partnerId(), this.launchId(), this.approvalId(), this.itemId())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<ApprovalItemComment[] | null>) => {
        this.loading.set(false);
        if (response.error || !response.data) {
          if (this.#hasLoaded) {
            this.refreshFailed.set(true);
          } else {
            this.loadFailed.set(true);
          }
          return;
        }
        this.#hasLoaded = true;
        this.refreshFailed.set(false);
        this.#comments.set(mergeLocalComments(response.data, this.#localSinceLoad()));
        this.countChange.emit(this.#comments().length);
      });
  }

  #handleMentionKeydown(field: ApprovalItemCommentField, event: KeyboardEvent): boolean {
    this.#mentionListPress = null;
    const options = this.mentionOptions();
    if (field !== this.#mentionField() || options.length === 0 || !approvalCommentMentionKeys.includes(event.key)) {
      return false;
    }
    event.preventDefault();
    switch (event.key) {
      case 'ArrowDown':
        this.activeMentionIndex.set((this.activeMentionIndex() + 1) % options.length);
        this.#scrollActiveOptionIntoView();
        break;
      case 'ArrowUp':
        this.activeMentionIndex.set((this.activeMentionIndex() - 1 + options.length) % options.length);
        this.#scrollActiveOptionIntoView();
        break;
      case 'Escape':
        this.#dismissedMentionStart = this.#mentionQuery()?.start ?? null;
        this.#mentionQuery.set(null);
        break;
      default:
        this.#selectMention(options[Math.min(this.activeMentionIndex(), options.length - 1)].person);
    }
    return true;
  }

  #selectMention(person: ApprovalMentionable): void {
    this.#mentionListPress = null;
    const query = this.#mentionQuery();
    if (query === null) {
      return;
    }
    const field = this.#mentionField();
    const control = this.#control(field);
    const insertion = insertMention(control.value, query, person.name);
    const mentions = field === 'composer' ? this.#selectedMentions : this.#editMentions;
    mentions.update(selected => new Map(selected).set(person.email, person.name));
    this.#settingValue = true;
    control.setValue(insertion.text);
    this.#settingValue = false;
    this.#mentionQuery.set(null);
    this.#placeCaret(field, insertion.caret);
  }

  #closeMentionPicker(field: ApprovalItemCommentField): void {
    if (this.#mentionField() === field) {
      this.#mentionQuery.set(null);
      this.#dismissedMentionStart = null;
    }
  }

  #control(field: ApprovalItemCommentField): FormControl<string> {
    return field === 'composer' ? this.bodyControl : this.editControl;
  }

  #scrollActiveOptionIntoView(): void {
    const optionId = this.mentionOptionId(this.activeMentionIndex());
    afterNextRender(() => this.#document.getElementById(optionId)?.scrollIntoView?.({ block: 'nearest' }), { injector: this.#injector });
  }

  #textarea(field: ApprovalItemCommentField): HTMLTextAreaElement | null {
    const element: unknown = (field === 'composer' ? this.composer() : this.editor())?.textareaElement?.nativeElement;
    return element instanceof HTMLTextAreaElement ? element : null;
  }

  #caret(field: ApprovalItemCommentField, text: string): number {
    return this.#textarea(field)?.selectionStart ?? text.length;
  }

  #placeCaret(field: ApprovalItemCommentField, position: number): void {
    afterNextRender(
      () =>
        queueMicrotask(() => {
          const textarea = this.#textarea(field);
          textarea?.focus();
          textarea?.setSelectionRange(position, position);
        }),
      { injector: this.#injector },
    );
  }
}
