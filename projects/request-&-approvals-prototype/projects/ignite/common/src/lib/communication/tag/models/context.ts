import { InjectionToken, type Signal } from '@angular/core';

/**
 * Sentiment palette applied to a tag's colour intent.
 *
 * The modern `@ignite/common` Tag component doesn't ship yet — this type lives
 * here as its future home. The legacy `IgntTagComponent` re-exports it, so all
 * existing consumers importing `TagSentiment` from the legacy path keep working
 * unchanged.
 */
export type TagSentiment = 'positive' | 'danger' | 'warning' | 'accent' | 'info' | 'disable' | 'sharp';

/**
 * Ambient defaults an ancestor can provide to `<ignt-tag>` descendants.
 *
 * Angular's hierarchical DI resolves at the closest ancestor providing the token,
 * so a nearer host fully replaces a further one — no unbounded reach across
 * unrelated layers. Values here act as **defaults only**; the tag's own explicit
 * inputs win over any ambient value.
 *
 * ### Resolution order (tag)
 * 1. The tag's own input (per-instance override the consumer typed).
 * 2. The nearest ancestor's context value (this token).
 * 3. The tag's built-in default.
 *
 * ### When to provide it
 * On a host that projects `<ignt-tag>` into its content and has an opinion about
 * how nested tags should look by default — e.g. a pill button that wants nested
 * tags to render `sharp` and flip to `disable` while it's disabled.
 *
 * Keep the shape small — every host that provides this token fully replaces the
 * outer one (no merge), so more fields = more re-specification for each provider.
 */
export interface IgntTagContext {
  readonly sentiment?: Signal<TagSentiment | undefined>;
}

export const IGNT_TAG_CONTEXT = new InjectionToken<IgntTagContext>('IGNT_TAG_CONTEXT');
