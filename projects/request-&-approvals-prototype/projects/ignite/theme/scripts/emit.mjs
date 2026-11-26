// Turns the resolved combinations (resolve.mjs, in memory) into the consumer
// formats: web (CSS + SCSS), Android resources and Swift. Every Tokens Studio
// quirk is already resolved before any emitter sees a value.
//
// Two rules shape every output:
//
// 1. Only published tokens are emitted. `com.figma.hiddenFromPublishing:
//    false` is what the publishing rule uses to say "a designer may bind
//    this"; code gets the same list, so the raw scales (color.blue.500,
//    dimension.8, font-size.16) stay out of the public surface in code exactly
//    as they do in Figma.
// 2. Brand is a file; theme and viewport are a cascade wherever the platform
//    has one. A brand can never be switched at runtime (different typeface,
//    different ramp, different radii), so it gets its own artefact. Theme and
//    viewport do switch at runtime, so they are emitted as deltas against a
//    base — dark overrides only the colours that actually change, tablet and
//    desktop only the lengths that actually change.
//
// This file is only the driver: it checks the cascade holds and asks each
// selected platform (platforms/index.mjs) for its files as strings. It
// touches no file: where they land is the post-process step, write.mjs.
import {
  assertAxesAreOrthogonal,
  assertKnownAxesAndModes,
  BASE_THEME,
  BASE_VIEWPORT,
  groupByBrand,
  viewportScopedPaths,
} from './model/cascade.mjs';
import { PLATFORMS } from './platforms/index.mjs';

// Platform name -> its files ({ destination, contents }), for the selected
// platforms (selection.mjs); every platform when none is given.
export function renderPlatforms({ resolved, platforms = PLATFORMS.map(platform => platform.name) } = {}) {
  assertKnownAxesAndModes(resolved);
  // Descriptions differ per brand (and per theme/viewport), so each brand
  // documents its tokens with its own base combination's text: the
  // light/mobile values its :root block declares.
  const docs = new Map(
    resolved
      .filter(combo => combo.axes.theme === BASE_THEME && combo.axes.viewport === BASE_VIEWPORT)
      .map(combo => [combo.axes.brand, combo.descriptions]),
  );
  const viewportScoped = viewportScopedPaths(resolved);

  const rendered = new Map();
  for (const platform of PLATFORMS.filter(candidate => platforms.includes(candidate.name))) {
    const brands = groupByBrand(resolved, platform.name);
    for (const [brand, byKey] of brands) {
      assertAxesAreOrthogonal(byKey, brand);
    }
    rendered.set(platform.name, platform.render({ brands, viewportScoped, docs }));
  }
  return rendered;
}
