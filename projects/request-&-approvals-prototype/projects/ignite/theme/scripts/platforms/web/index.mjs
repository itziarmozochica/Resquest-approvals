// @ts-check
import { renderBrand } from './brand.mjs';
import * as colors from './colors.mjs';
import * as dimensions from './dimensions.mjs';
import * as elevation from './elevation.mjs';
import * as typography from './typography.mjs';

const categories = { colors, dimensions, typography, elevation };

/** @type {import('../index.mjs').Platform} */
export const platform = {
  name: 'web',
  // px on dimensions, shadow offsets and font sizes; unitless line-height
  // (150% -> 1.5, so a nested font size keeps its own leading); numeric font
  // weights; Tokens Studio's innerShadow as an inset layer; box-shadow shorthand.
  transforms: ['ts/size/px', 'ts/size/lineheight', 'ts/typography/fontWeight', 'ts/shadow/innerShadow', 'shadow/css/shorthand'],
  categories,
  render: ({ brands, viewportScoped, docs }) => {
    const out = [...brands].flatMap(([brand, byKey]) =>
      renderBrand(brand, byKey, { categories, viewportScoped, docs: docs.get(brand) ?? new Map() }),
    );
    // Brand-agnostic: every brand declares the same custom-property names, so
    // the first (default) brand's token list and descriptions are the shared shape.
    const [[firstBrand, byKey]] = brands;
    out.push({ destination: '_text-styles.scss', contents: typography.textStyles(byKey, docs.get(firstBrand) ?? new Map()) });
    return out;
  },
};
