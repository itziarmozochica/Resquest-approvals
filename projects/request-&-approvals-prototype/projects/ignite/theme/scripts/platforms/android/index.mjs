// @ts-check
import { renderBrand } from './brand.mjs';
import * as colors from './colors.mjs';
import * as dimensions from './dimensions.mjs';
import * as elevation from './elevation.mjs';
import * as typography from './typography.mjs';

const categories = { colors, dimensions, typography, elevation };

/** @type {import('../index.mjs').Platform} */
export const platform = {
  name: 'android',
  // None fits. color/hex8android is not transitive, so a colour that
  // references another inherits its #AARRGGBB, and the rgba({ref}, a) collapse
  // can no longer read the hex it composes (8 translucent colours broke). SD's
  // Android size built-ins convert rem, not the px these tokens hold.
  transforms: [],
  categories,
  render: ({ brands, viewportScoped, docs }) =>
    [...brands].flatMap(([brand, byKey]) => renderBrand(brand, byKey, { categories, viewportScoped, docs: docs.get(brand) ?? new Map() })),
};
