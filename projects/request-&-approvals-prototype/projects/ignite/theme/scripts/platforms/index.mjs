// @ts-check
// The registry of code platforms. Every platform is a folder with the same six
// files and the same entry points, whatever format it writes:
//
//   index.mjs       the Platform record below
//   brand.mjs       renderBrand(brand, byKey, ctx): one brand's files
//   colors.mjs      kinds, render(tokens, ctx) and codeSyntax(token, ctx)
//   dimensions.mjs  kinds, render(tokens, ctx) and codeSyntax(token, ctx)
//   typography.mjs  kinds and render(tokens, ctx)
//   elevation.mjs   kinds and render(tokens, ctx)
//
// Only colours and dimensions have a codeSyntax: the composites are Figma
// styles, and a style has no code-syntax field. A platform's `transforms` are
// the Style Dictionary built-ins resolve.mjs applies to its tokens on top of
// the shared resolution, so its categories receive values already in the
// platform's form wherever a built-in exists. Adding a platform is a new
// folder plus one line here; the driver never changes. build-code.test.mjs
// enforces the shape.

/**
 * One resolved, published token.
 * @typedef {{ path: string, type: string, value: unknown }} FlatToken
 */
/**
 * A brand's combinations: "theme|viewport" -> its published tokens.
 * @typedef {Map<string, FlatToken[]>} BrandCombos
 */
/**
 * What every platform's render receives.
 * @typedef {{ brands: Map<string, BrandCombos>, viewportScoped: Set<string>, docs: Map<string, Map<string, string>> }} Ctx
 */
/**
 * @typedef {{ destination: string, contents: string }} EmittedFile
 */
/**
 * One category file. render's ctx is the platform's own (indentation, the dark
 * index, the resource folder, …).
 * @typedef {object} Category
 * @property {ReadonlyArray<string>} kinds   the kindOf() values it owns
 * @property {(tokens: FlatToken[], ctx: unknown) => string} render
 * @property {(token: FlatToken, ctx: { viewportScoped: Set<string> }) => string} [codeSyntax]
 */
/**
 * @typedef {object} Platform
 * @property {string} name        the --platforms= selector (where its files land is write.mjs's call)
 * @property {ReadonlyArray<string>} transforms  Style Dictionary transforms for this platform's tokens
 * @property {{ colors: Category, dimensions: Category, typography: Category, elevation: Category }} categories
 * @property {(ctx: Ctx) => EmittedFile[]} render
 */
import { platform as android } from './android/index.mjs';
import { platform as ios } from './ios/index.mjs';
import { platform as web } from './web/index.mjs';

/** @type {ReadonlyArray<Platform>} */
export const PLATFORMS = [web, android, ios];
