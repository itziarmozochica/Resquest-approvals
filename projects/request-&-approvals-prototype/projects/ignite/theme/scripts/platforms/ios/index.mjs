// @ts-check
import { renderBrand, sharedTypes } from './brand.mjs';
import * as colors from './colors.mjs';
import * as dimensions from './dimensions.mjs';
import * as elevation from './elevation.mjs';
import * as typography from './typography.mjs';

const categories = { colors, dimensions, typography, elevation };

/** @type {import('../index.mjs').Platform} */
export const platform = {
  name: 'ios',
  // None fits: color/UIColorSwift converts colour tokens but not the colours
  // inside shadow layers, which need the same UIColor, and Swift's font
  // weights are names (.semibold), not the numbers ts/typography/fontWeight
  // gives. colors.mjs's swiftColor does both kinds of colour.
  transforms: [],
  categories,
  render: ({ brands, viewportScoped, docs }) => [
    ...[...brands].flatMap(([brand, byKey]) =>
      renderBrand(brand, byKey, { categories, viewportScoped, docs: docs.get(brand) ?? new Map() }),
    ),
    sharedTypes(),
  ],
};
