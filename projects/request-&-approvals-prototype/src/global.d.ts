import { VisitorTraits } from './app/shared/services/script-loader/survicate/visitor-traits.model';

declare global {
  /**
   * @deprecated ⛔ Direct `localStorage` access is restricted in `src/app/**`.
   * Inject `STORAGE_SERVICE` from `@fz/storage` instead —
   * it provides defensive `try/catch`, SSR-safe guards, generic `get<T>` / `set<T>` and central
   * Datadog logging. See FEVERZONE-1B0 for the incident that motivated the restriction.
   *
   * The `@deprecated` mark is cosmetic (IDE only) and complements the ESLint
   * `no-restricted-globals` rule wired in `eslint.config.mjs`.
   */
  // eslint-disable-next-line no-var
  var localStorage: Storage;

  /**
   * @deprecated ⛔ Direct `sessionStorage` access is restricted in `src/app/**`.
   * Inject `STORAGE_SERVICE` from `@fz/storage` instead.
   * A `SessionStorageService` implementation can be added on demand.
   */
  // eslint-disable-next-line no-var
  var sessionStorage: Storage;

  type ZendeskConversationField = {
    id: string;
    value: string;
  };

  interface Window {
    /**
     * @deprecated ⛔ Direct `window.localStorage` access is restricted in `src/app/**`.
     * Inject `STORAGE_SERVICE` from `@fz/storage` instead.
     * See FEVERZONE-1B0.
     */
    readonly localStorage: Storage;

    /**
     * @deprecated ⛔ Direct `window.sessionStorage` access is restricted in `src/app/**`.
     * Inject `STORAGE_SERVICE` from `@fz/storage` instead.
     */
    readonly sessionStorage: Storage;

    _svd?: unknown;
    _svc?: unknown;
    _sva?: {
      traits: Record<string, unknown> & Partial<SeenTrait>;
      addEventListener?: (eventName: string, callback: (surveyId: string) => void | never) => void;
      destroyVisitor?: (retarget: unknown) => void;
      getState?: () => { backendData?: { surveys: { id: string; settings: { recurring: unknown; recurring_period: number } }[] } };
      retarget?: unknown;
      removeEventListener?: (target: string) => void;
      setVisitorTraits?: (visitorTraits: VisitorTraits) => void;
    };
    zE?: {
      (widget: 'webWidget', action: string, ...args: unknown[]): void;
      (widget: 'messenger', action: string, ...args: unknown[]): void;
      (
        widget: 'messenger',
        action: 'loginUser',
        jwtCallback: (tokenCallback: (jwt: string) => void) => void,
        loginCallback?: (error: unknown | null) => void,
      ): void;
      (widget: 'messenger:set', action: 'conversationFields', fields: ZendeskConversationField[]): void;
      (widget: 'messenger:set', action: 'conversationTags', tags: string[]): void;
      (widget: 'messenger:on', event: 'close' | 'open', callback: () => void): void;
    };
    zESettings?: {
      webWidget?: {
        chat?: {
          connectOnPageLoad?: boolean;
          suppress?: boolean;
          tags?: string[];
        };
        contactForm?: {
          suppress?: boolean;
        };
      };
    };
    fzDevConfig: unknown;
    opera: string;
    MSStream: unknown;
  }
}

export type SeenTrait = { [key: `${string}_seen`]: boolean | { delete: unknown } };

export {};
