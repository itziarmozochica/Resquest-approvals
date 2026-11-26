// One Swift file per brand, extending the shared namespace, plus the shared
// types file every brand file needs. The types live in one file because two
// brands added to the same target would otherwise redeclare Viewport,
// TextStyle and ShadowLayer and fail to compile. Colours resolve light/dark
// through the trait collection; viewport is an explicit argument, since iOS
// has no breakpoint of its own.
import { BASE_THEME, baseTokens, darkTokens, indexByPath, key, VIEWPORT_ORDER } from '../../model/cascade.mjs';
import { byCategory } from '../../model/kinds.mjs';
import { comment, GENERATED } from '../shared/docs.mjs';
import { NAMESPACE, pascal } from '../shared/names.mjs';

const ROOT = pascal(NAMESPACE);

const indentBy = (indent, block) =>
  block
    .split('\n')
    .map(line => (line === '' ? line : `${indent}${line}`))
    .join('\n');

export function renderBrand(brand, byKey, { categories, viewportScoped, docs }) {
  const ctx = {
    root: ROOT,
    docs,
    darkIndex: indexByPath(darkTokens(byKey)),
    byViewport: Object.fromEntries(
      VIEWPORT_ORDER.map(viewport => [viewport, indexByPath(byKey.get(key({ theme: BASE_THEME, viewport })))]),
    ),
    variesByViewport: token => viewportScoped.has(token.path),
  };
  // Each member is written with one level of its own indentation; the brand
  // enum and the extension wrapper add the other two.
  const body = byCategory(categories, baseTokens(byKey))
    .filter(group => group.tokens.length)
    .map(group => group.category.render(group.tokens, ctx))
    .join('\n\n');
  const contents = [
    comment(
      [
        GENERATED,
        `Brand: ${brand}.`,
        `Extends the ${ROOT} namespace declared in ${ROOT}Tokens.swift — add that file too.`,
        'Colours resolve light/dark through the trait collection; viewport is an',
        'explicit argument, since iOS has no breakpoint of its own.',
      ],
      '// ',
    ),
    '',
    'import UIKit',
    '',
    `public extension ${ROOT} {`,
    `    enum ${pascal(brand)} {`,
    indentBy('        ', body),
    '    }',
    '}',
    '',
  ].join('\n');
  return [{ destination: `${ROOT}+${pascal(brand)}.swift`, contents }];
}

export function sharedTypes() {
  return {
    destination: `${ROOT}Tokens.swift`,
    contents: `import UIKit

/// ${GENERATED}
/// Shared types for every brand. Add this file once, then one ${ROOT}+<Brand>.swift.
public enum ${ROOT} {
    public enum Viewport {
        case mobile, tablet, desktop
    }

    public struct TextStyle {
        public let fontFamily: String
        public let fontWeight: UIFont.Weight
        public let fontSize: CGFloat
        /// Multiplier over fontSize, not an absolute value.
        public let lineHeight: CGFloat
        public let letterSpacing: CGFloat
    }

    public struct ShadowLayer {
        public let offset: CGSize
        public let blur: CGFloat
        public let spread: CGFloat
        public let color: UIColor
    }

    public static func dynamicColor(light: UIColor, dark: UIColor) -> UIColor {
        UIColor { $0.userInterfaceStyle == .dark ? dark : light }
    }
}
`,
  };
}
