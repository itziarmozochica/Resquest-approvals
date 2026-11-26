import type { Signal } from '@angular/core';

/**
 * Merges the layers provided for an `IGNT_*_TRANSLATIONS` token over a component's English defaults.
 *
 * Every Ignite component that renders copy of its own takes it from a token of
 * `Signal<Partial<T>>` layers registered with `multi: true`, so an application can set the copy once at
 * root and a route or a feature can narrow it further. Angular hands a `multi` token over as an array and a
 * lone non-multi provider as a single signal, so both shapes are normalised here. Later layers win, which
 * puts the provider closest to the component last.
 *
 * Where the merge runs differs by component and does not change this contract: a component that lives in a
 * template does it in a host directive, so it sees the whole injector chain, while one created by a root
 * service does it in the service, because there is no chain to walk.
 *
 * Inject the token with `{ optional: true }`, so an application that translates nothing still gets the
 * defaults. The result is always a new object; `defaults` is never mutated.
 */
export function igntMergeTranslations<T extends object>(
  injected: Signal<Partial<T>> | readonly Signal<Partial<T>>[] | null | undefined,
  defaults: T,
): T {
  let layers: readonly Signal<Partial<T>>[] = [];
  if (Array.isArray(injected)) {
    layers = injected;
  } else if (injected !== null && injected !== undefined) {
    layers = [injected as Signal<Partial<T>>];
  }

  return layers.reduce<T>(
    (merged, layer) => {
      // A key set to `undefined` is dropped rather than written over the default. A translation factory that
      // reads a key the locale file is missing hands back `{ close: undefined }`, and a plain spread would put
      // that on the result: the type still claims every key of `T` is present, while the component renders
      // nothing — an empty `aria-label` being the worst case.
      const overrides = Object.fromEntries(Object.entries(layer()).filter(([, value]) => value !== undefined));

      // `Object.fromEntries` widens to `{ [k: string]: unknown }`; the entries came from a `Partial<T>` and
      // only had undefined values removed, so every remaining key is still a key of `T`.
      return { ...merged, ...(overrides as Partial<T>) };
    },
    { ...defaults },
  );
}
